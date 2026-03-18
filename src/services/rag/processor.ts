/**
 * Arquivo: src/services/rag/processor.ts
 * Propósito: Worker de processamento RAG — extrai texto do PDF, chunka e gera embeddings.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { PDFParse } from "pdf-parse";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/services/rag/chunker";

const RAG_BUCKET = "Axiomix - v2";
const EMBEDDING_BATCH_SIZE = 20;

type RagProcessPayload = {
  documentId: string;
};

async function updateDocumentStatus(
  documentId: string,
  status: "processing" | "ready" | "failed",
  extra?: { totalChunks?: number; errorMessage?: string }
) {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("rag_documents")
    .update({
      status,
      total_chunks: extra?.totalChunks ?? undefined,
      error_message: extra?.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

export async function runRagProcessWorker(
  companyId: string,
  payload: RagProcessPayload
): Promise<{ documentId: string; totalChunks: number }> {
  const { documentId } = payload;
  const supabase = createSupabaseAdminClient();

  console.log(`[RAG] Iniciando processamento: doc=${documentId} company=${companyId}`);

  // Lock atômico: só processa se o documento estiver "pending" ou "failed".
  // Previne processamento duplo.
  const { data: locked } = await supabase
    .from("rag_documents")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .in("status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (!locked) {
    console.log(`[RAG] Documento ${documentId} não está pending/failed, pulando.`);
    return { documentId, totalChunks: 0 };
  }

  console.log(`[RAG] Lock adquirido: doc=${documentId}`);

  try {
    // 1. Buscar registro do documento
    const { data: doc, error: docError } = await supabase
      .from("rag_documents")
      .select("storage_path")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      throw new Error(`Documento ${documentId} não encontrado.`);
    }

    // 2. Baixar PDF do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(RAG_BUCKET)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Falha ao baixar PDF: ${downloadError?.message ?? "Arquivo não encontrado."}`);
    }

    // 3. Extrair texto com pdf-parse v2
    const pdfBuffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`[RAG] PDF baixado: ${pdfBuffer.length} bytes`);
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const extractedText = textResult.text;
    await parser.destroy();

    console.log(`[RAG] Texto extraído: ${extractedText.length} chars`);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("PDF não contém texto extraível.");
    }

    // 4. Chunkar texto
    const chunks = chunkText(extractedText);
    console.log(`[RAG] Chunks gerados: ${chunks.length}`);

    if (chunks.length === 0) {
      throw new Error("Nenhum chunk gerado a partir do texto do PDF.");
    }

    // 5. Limpar chunks antigos (segurança contra duplicatas em reprocessamento)
    await supabase
      .from("rag_document_chunks")
      .delete()
      .eq("document_id", documentId);

    // 6. Gerar embeddings e inserir em batches (menor uso de memória, INSERT menor)
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchTexts = batch.map((c) => c.content);
      const batchEmbeddings = await generateEmbeddings(companyId, batchTexts);

      const insertRows = batch.map((chunk, j) => {
        const embedding = batchEmbeddings[j];
        if (!embedding || !Array.isArray(embedding)) {
          throw new Error(`Batch ${i}, chunk ${j}: embedding inválido.`);
        }
        return {
          document_id: documentId,
          company_id: companyId,
          chunk_index: i + j,
          content: chunk.content,
          token_count: chunk.tokenCount,
          embedding: JSON.stringify(embedding),
        };
      });

      const { error: insertError } = await supabase
        .from("rag_document_chunks")
        .insert(insertRows);

      if (insertError) {
        throw new Error(`Falha ao inserir batch ${i}: ${insertError.message}`);
      }

      console.log(`[RAG] Batch ${i / EMBEDDING_BATCH_SIZE + 1}/${Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE)}: ${batch.length} embeddings inseridos`);
    }

    // 8. Atualizar status para ready
    await updateDocumentStatus(documentId, "ready", { totalChunks: chunks.length });

    return { documentId, totalChunks: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no processamento RAG.";
    console.error(`[RAG] Erro no processamento doc=${documentId}:`, message);
    await updateDocumentStatus(documentId, "failed", { errorMessage: message });
    throw error;
  }
}
