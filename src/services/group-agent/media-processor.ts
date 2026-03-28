/**
 * Arquivo: src/services/group-agent/media-processor.ts
 * Propósito: Processador unificado de mídia para o agente de grupo (PDF, áudio, imagem).
 * Autor: AXIOMIX
 * Data: 2026-03-23
 */

import "server-only";

import {
  openRouterChatCompletion,
  openRouterAudioTranscription,
} from "@/lib/ai/openrouter";
import type { GroupAgentMediaContent, GroupAgentMediaType } from "@/types/modules/group-agent.types";

const LOG_PREFIX = "[group-agent/media]";
const PDF_TEXT_LIMIT = 3000;

/**
 * Extrai texto de um PDF a partir do base64.
 */
async function extractPdfText(base64: string): Promise<string> {
  const pdfBuffer = Buffer.from(base64, "base64");
  console.log(LOG_PREFIX, `PDF recebido: ${pdfBuffer.length} bytes`);

  const { extractTextFromPdf } = await import("@/lib/pdf/extract-text");
  const text = await extractTextFromPdf(pdfBuffer, PDF_TEXT_LIMIT);
  console.log(LOG_PREFIX, `PDF texto extraído: ${text.length} chars`);
  return text;
}

/**
 * Transcreve áudio via OpenRouter Whisper.
 */
async function transcribeAudio(
  companyId: string,
  base64: string,
  mimetype: string
): Promise<string> {
  console.log(LOG_PREFIX, `Transcrevendo áudio: mimetype=${mimetype}`);

  const transcription = await openRouterAudioTranscription(companyId, base64, mimetype);
  console.log(LOG_PREFIX, `Transcrição concluída: ${transcription.length} chars`);

  return transcription;
}

/**
 * Descreve uma imagem via GPT-4o Vision pelo OpenRouter.
 */
async function describeImage(
  companyId: string,
  base64: string,
  mimetype: string
): Promise<string> {
  console.log(LOG_PREFIX, "Descrevendo imagem via Vision");

  const dataUrl = `data:${mimetype};base64,${base64}`;

  const description = await openRouterChatCompletion(companyId, [
    {
      role: "system",
      content:
        "Voce e um assistente visual. Descreva a imagem de forma detalhada e objetiva em portugues brasileiro. " +
        "Identifique textos, graficos, tabelas, pessoas, objetos e qualquer informacao relevante. " +
        "Se houver texto na imagem, transcreva-o. Maximo 500 palavras.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Descreva esta imagem:" },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ], {
    responseFormat: "text",
    temperature: 0.2,
    module: "group_agent",
    operation: "describe_image",
  });

  console.log(LOG_PREFIX, `Descrição da imagem: ${description.length} chars`);
  return description;
}

/**
 * Determina o tipo de mídia a partir do messageType da Evolution API.
 */
export function resolveMediaType(messageType: string): GroupAgentMediaType | null {
  const normalized = messageType.toLowerCase();

  if (normalized.includes("audio") || normalized.includes("ptt")) {
    return "audio";
  }
  if (normalized.includes("image") || normalized.includes("sticker")) {
    return "image";
  }
  if (normalized.includes("document")) {
    return "pdf";
  }

  return null;
}

/**
 * Verifica se o documento é realmente um PDF pelo mimetype.
 */
export function isPdfDocument(mimetype: string): boolean {
  return mimetype.includes("pdf");
}

/**
 * Processador unificado: recebe mídia e retorna conteúdo textual extraído.
 */
export async function processMediaMessage(
  companyId: string,
  mediaType: GroupAgentMediaType,
  base64: string,
  mimetype: string
): Promise<GroupAgentMediaContent> {
  let extractedText: string;

  switch (mediaType) {
    case "pdf":
      extractedText = await extractPdfText(base64);
      break;

    case "audio":
      extractedText = await transcribeAudio(companyId, base64, mimetype);
      break;

    case "image":
      extractedText = await describeImage(companyId, base64, mimetype);
      break;

    default:
      throw new Error(`Tipo de mídia não suportado: ${mediaType}`);
  }

  return {
    type: mediaType,
    extractedText,
    base64: mediaType === "image" ? base64 : undefined,
    mimetype: mediaType === "image" ? mimetype : undefined,
  };
}
