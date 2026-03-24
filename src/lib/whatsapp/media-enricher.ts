/**
 * Arquivo: src/lib/whatsapp/media-enricher.ts
 * Propósito: Enriquece mensagens de mídia (imagem, áudio, documento) com conteúdo extraído por IA,
 *            antes da análise de conversas no WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-23
 */

import "server-only";

import https from "node:https";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  openRouterChatCompletion,
  openRouterAudioTranscription,
} from "@/lib/ai/openrouter";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

const LOG_PREFIX = "[whatsapp/media-enricher]";

const MEDIA_TYPES_IMAGE = new Set(["image", "sticker"]);
const MEDIA_TYPES_AUDIO = new Set(["audio", "ptt"]);
const MEDIA_TYPES_DOCUMENT = new Set(["document"]);

export type MessageToEnrich = {
  id: string;
  message_type?: string | null;
  content: string | null;
  media_url?: string | null;
  [key: string]: unknown;
};

function ensureAbsoluteUrl(url: string, baseUrl?: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (!baseUrl) return url;
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Baixa a mídia de uma URL e retorna base64 + mimetype.
 */
/**
 * Baixa via node:https com rejectUnauthorized=false (Sofia CRM pode ter cert auto-assinado).
 */
function httpsGet(
  urlStr: string,
  token?: string
): Promise<{ base64: string; mimetype: string; status: number }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] ?? "application/octet-stream";
        resolve({
          base64: buffer.toString("base64"),
          mimetype: contentType.split(";")[0].trim(),
          status: res.statusCode ?? 0,
        });
      });
    });

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error("Timeout ao baixar mídia."));
    });
    req.end();
  });
}

async function downloadMediaFromUrl(
  url: string,
  sofiaBaseUrl?: string,
  sofiaToken?: string
): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const absoluteUrl = ensureAbsoluteUrl(url, sofiaBaseUrl);
    const isSofiaRelative = !url.startsWith("http");

    // URLs internas do Sofia CRM: usar node:https com SSL flexível
    if (isSofiaRelative && absoluteUrl.startsWith("https://")) {
      const result = await httpsGet(absoluteUrl, sofiaToken);
      if (result.status < 200 || result.status >= 300) {
        console.warn(LOG_PREFIX, `Falha ao baixar mídia (HTTP ${result.status}): ${url}`);
        return null;
      }
      return { base64: result.base64, mimetype: result.mimetype };
    }

    // URLs externas: fetch padrão
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(absoluteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(LOG_PREFIX, `Falha ao baixar mídia (HTTP ${response.status}): ${url}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const mimetype = contentType.split(";")[0].trim();
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return { base64, mimetype };
  } catch (error) {
    console.warn(LOG_PREFIX, "Erro ao baixar mídia:", error);
    return null;
  }
}

/**
 * Descreve uma imagem via Vision (GPT-4o).
 */
async function describeImage(
  companyId: string,
  base64: string,
  mimetype: string
): Promise<string> {
  const dataUrl = `data:${mimetype};base64,${base64}`;

  return openRouterChatCompletion(
    companyId,
    [
      {
        role: "system",
        content:
          "Voce e um assistente visual. Descreva a imagem de forma detalhada e objetiva em portugues brasileiro. " +
          "Identifique textos, graficos, tabelas, pessoas, objetos e qualquer informacao relevante para contexto comercial. " +
          "Se houver texto na imagem, transcreva-o. Maximo 400 palavras.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Descreva esta imagem:" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    { responseFormat: "text", temperature: 0.2, model: "openai/gpt-4o-mini" }
  );
}

/**
 * Transcreve áudio via Whisper.
 */
async function transcribeAudio(
  companyId: string,
  base64: string,
  mimetype: string
): Promise<string> {
  return openRouterAudioTranscription(companyId, base64, mimetype);
}

/**
 * Extrai texto de PDF (lazy import para não incluir no bundle desnecessariamente).
 */
async function extractPdfText(base64: string): Promise<string> {
  const { extractTextFromPdf } = await import("@/lib/pdf/extract-text");
  const buffer = Buffer.from(base64, "base64");
  return extractTextFromPdf(buffer, 3000);
}

/**
 * Processa uma mensagem de mídia e retorna o conteúdo extraído.
 * Retorna null se não for possível processar.
 */
async function processMediaMessage(
  companyId: string,
  message: MessageToEnrich,
  sofiaBaseUrl?: string,
  sofiaToken?: string
): Promise<string | null> {
  const type = (message.message_type ?? "").toLowerCase();
  const url = message.media_url;

  if (!url) return null;

  const media = await downloadMediaFromUrl(url, sofiaBaseUrl, sofiaToken);
  if (!media) return null;

  const { base64, mimetype } = media;

  try {
    if (MEDIA_TYPES_IMAGE.has(type)) {
      const description = await describeImage(companyId, base64, mimetype);
      return `[Imagem] ${description}`;
    }

    if (MEDIA_TYPES_AUDIO.has(type)) {
      const transcription = await transcribeAudio(companyId, base64, mimetype);
      return `[Áudio] ${transcription}`;
    }

    if (MEDIA_TYPES_DOCUMENT.has(type)) {
      if (!mimetype.includes("pdf")) return null;
      const text = await extractPdfText(base64);
      return `[Documento] ${text}`;
    }
  } catch (error) {
    console.warn(LOG_PREFIX, `Erro ao processar ${type}:`, error);
  }

  return null;
}

/**
 * Determina se uma mensagem precisa de enriquecimento de mídia.
 */
function needsEnrichment(message: MessageToEnrich): boolean {
  const type = (message.message_type ?? "").toLowerCase();
  const hasMediaType =
    MEDIA_TYPES_IMAGE.has(type) ||
    MEDIA_TYPES_AUDIO.has(type) ||
    MEDIA_TYPES_DOCUMENT.has(type);

  if (!hasMediaType) return false;
  if (!message.media_url) return false;

  // Já foi processado anteriormente (content começa com tag de mídia)
  const content = message.content ?? "";
  if (
    content.startsWith("[Imagem]") ||
    content.startsWith("[Áudio]") ||
    content.startsWith("[Documento]")
  ) {
    return false;
  }

  return true;
}

/**
 * Enriquece mensagens de mídia com conteúdo extraído por IA.
 * Atualiza o content no banco de dados para cache (evita reprocessamento).
 * Retorna as mensagens com content atualizado.
 */
export async function enrichMediaMessages<T extends MessageToEnrich>(
  companyId: string,
  messages: T[]
): Promise<T[]> {
  const toProcess = messages.filter(needsEnrichment);

  if (toProcess.length === 0) return messages;

  console.log(LOG_PREFIX, `Processando ${toProcess.length} mensagem(ns) de mídia`);

  // Resolver base URL do Sofia CRM para URLs relativas de mídia
  let sofiaBaseUrl: string | undefined;
  let sofiaToken: string | undefined;
  try {
    const sofiaClient = await getSofiaCrmClient(companyId);
    sofiaBaseUrl = sofiaClient.baseUrl;
    sofiaToken = sofiaClient.apiToken;
  } catch {
    // Sofia CRM pode não estar configurado — URLs relativas não serão resolvidas
  }

  const supabase = createSupabaseAdminClient();
  const updatedContents = new Map<string, string>();

  await Promise.allSettled(
    toProcess.map(async (message) => {
      const extracted = await processMediaMessage(companyId, message, sofiaBaseUrl, sofiaToken);
      if (extracted) {
        updatedContents.set(message.id, extracted);

        // Persiste no DB para evitar reprocessamento futuro
        await supabase
          .from("messages")
          .update({ content: extracted })
          .eq("id", message.id)
          .eq("company_id", companyId);
      }
    })
  );

  return messages.map((msg) => {
    const updated = updatedContents.get(msg.id);
    return updated ? ({ ...msg, content: updated } as T) : msg;
  });
}
