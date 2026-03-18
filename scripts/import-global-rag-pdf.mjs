import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const RAG_BUCKET = "Axiomix - v2";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 20;
const DEFAULT_PDF_PATH = "C:/Users/Eneas/Downloads/spin selling.pdf";
const DEFAULT_SOURCE_KEY = "spin-selling-default";
const DEFAULT_STORAGE_PREFIX = "global/rag/default";

function loadEnvFile(filePath) {
  return fs.readFile(filePath, "utf8")
    .then((content) => {
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
          continue;
        }

        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
          continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        if (!key || process.env[key]) {
          continue;
        }

        let value = line.slice(separatorIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    })
    .catch(() => undefined);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value;
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

function splitByRecursiveSeparators(text) {
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return { segments: paragraphs, separator: "\n\n" };
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    return { segments: sentences, separator: " " };
  }

  return { segments: text.split(/\s+/), separator: " " };
}

function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize ?? 1000;
  const chunkOverlap = options.chunkOverlap ?? 200;
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanedText) {
    return [];
  }

  if (cleanedText.length <= chunkSize) {
    return [{ content: cleanedText, tokenCount: estimateTokenCount(cleanedText) }];
  }

  const { segments, separator } = splitByRecursiveSeparators(cleanedText);
  const chunks = [];
  let currentChunk = "";

  for (const segment of segments) {
    const candidate = currentChunk ? `${currentChunk}${separator}${segment}` : segment;

    if (candidate.length > chunkSize && currentChunk.length > 0) {
      const trimmed = currentChunk.trim();
      chunks.push({
        content: trimmed,
        tokenCount: estimateTokenCount(trimmed),
      });

      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      const overlap = currentChunk.slice(overlapStart);
      currentChunk = `${overlap}${separator}${segment}`;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim().length > 0) {
    const trimmed = currentChunk.trim();
    chunks.push({
      content: trimmed,
      tokenCount: estimateTokenCount(trimmed),
    });
  }

  return chunks;
}

async function generateEmbeddings(apiKey, texts) {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding batch error ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const embeddings = payload.data?.map((item) => item.embedding).filter(Boolean);

  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error(
      `Esperado ${texts.length} embeddings, recebeu ${embeddings?.length ?? 0}.`
    );
  }

  return embeddings;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    positional.push(arg);
  }

  return {
    pdfPath: positional[0] ?? DEFAULT_PDF_PATH,
    sourceKey: positional[1] ?? DEFAULT_SOURCE_KEY,
    displayName: positional[2] ?? path.basename(positional[0] ?? DEFAULT_PDF_PATH),
    dryRun: options.dryRun,
  };
}

async function extractPdfText(pdfPath) {
  const fileBuffer = await fs.readFile(pdfPath);
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const textResult = await parser.getText();
    return {
      fileBuffer,
      text: textResult.text?.trim() ?? "",
    };
  } finally {
    await parser.destroy();
  }
}

async function resolveExistingDocument(supabase, sourceKey) {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id, storage_path")
    .eq("scope", "global")
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Falha ao consultar documento global existente. Verifique se a migration 016 foi aplicada. ${error.message}`
    );
  }

  return data;
}

async function upsertDocumentRow(supabase, payload) {
  if (payload.id) {
    const { data, error } = await supabase
      .from("rag_documents")
      .update(payload)
      .eq("id", payload.id)
      .select("id")
      .single();

    if (error || !data?.id) {
      throw new Error(`Falha ao atualizar documento global: ${error?.message ?? "sem id"}`);
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from("rag_documents")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Falha ao criar documento global: ${error?.message ?? "sem id"}`);
  }

  return data.id;
}

async function main() {
  await loadEnvFile(path.join(projectRoot, ".env.local"));

  const { pdfPath, sourceKey, displayName, dryRun } = parseArgs(process.argv.slice(2));
  const absolutePdfPath = path.resolve(pdfPath);
  const { fileBuffer, text } = await extractPdfText(absolutePdfPath);

  if (!text) {
    throw new Error("O PDF nao possui texto extraivel.");
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error("Nenhum chunk foi gerado a partir do PDF.");
  }

  console.log(
    JSON.stringify(
      {
        pdfPath: absolutePdfPath,
        displayName,
        sourceKey,
        fileSize: fileBuffer.length,
        extractedChars: text.length,
        chunks: chunks.length,
        dryRun,
      },
      null,
      2
    )
  );

  if (dryRun) {
    return;
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const openRouterApiKey = requireEnv("OPENROUTER_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const existing = await resolveExistingDocument(supabase, sourceKey);
  const safeName = sanitizeFileName(path.basename(absolutePdfPath));
  const storagePath = `${DEFAULT_STORAGE_PREFIX}/${sourceKey}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(RAG_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Falha ao enviar PDF para o Storage: ${uploadError.message}`);
  }

  const documentId = await upsertDocumentRow(supabase, {
    id: existing?.id,
    company_id: null,
    scope: "global",
    source_key: sourceKey,
    file_name: displayName,
    file_size: fileBuffer.length,
    file_type: "application/pdf",
    storage_path: storagePath,
    status: "processing",
    total_chunks: 0,
    error_message: null,
    updated_at: new Date().toISOString(),
  });

  const { error: deleteChunksError } = await supabase
    .from("rag_document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (deleteChunksError) {
    throw new Error(`Falha ao limpar chunks antigos: ${deleteChunksError.message}`);
  }

  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE);
    const embeddings = await generateEmbeddings(
      openRouterApiKey,
      batch.map((chunk) => chunk.content)
    );

    const rows = batch.map((chunk, batchIndex) => ({
      document_id: documentId,
      company_id: null,
      scope: "global",
      chunk_index: index + batchIndex,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(embeddings[batchIndex]),
    }));

    const { error: insertError } = await supabase
      .from("rag_document_chunks")
      .insert(rows);

    if (insertError) {
      throw new Error(`Falha ao inserir batch ${index}: ${insertError.message}`);
    }

    console.log(
      `[global-rag] batch ${index / EMBEDDING_BATCH_SIZE + 1}/${Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE)} inserido`
    );
  }

  const { error: finalizeError } = await supabase
    .from("rag_documents")
    .update({
      status: "ready",
      total_chunks: chunks.length,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (finalizeError) {
    throw new Error(`Falha ao finalizar documento global: ${finalizeError.message}`);
  }

  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(RAG_BUCKET).remove([existing.storage_path]);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        documentId,
        sourceKey,
        storagePath,
        totalChunks: chunks.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[global-rag] ${detail}`);
  process.exitCode = 1;
});
