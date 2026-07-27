/**
 * Arquivo: src/lib/whatsapp/message-preview.ts
 * Propósito: Gera o preview denormalizado da última mensagem de uma conversa
 *            (colunas conversations.last_message_preview/direction/type).
 *            Usado por todos os escritores de `messages`: webhook evo-crm,
 *            send-message (insert otimista) e syncMessages (reconciliação).
 */

import { stripMessageHtml } from "@/lib/whatsapp/strip-message-html";

export const PREVIEW_MAX_LENGTH = 140;

/** Rótulos PT-BR para mensagens de mídia sem texto (convenção do media-enricher). */
const MEDIA_TYPE_LABELS: Array<[Set<string>, string]> = [
  [new Set(["image", "sticker"]), "[Imagem]"],
  [new Set(["audio", "ptt", "voice"]), "[Áudio]"],
  [new Set(["video"]), "[Vídeo]"],
  [new Set(["document", "file"]), "[Documento]"],
];

export type MessagePreviewInput = {
  content: string | null | undefined;
  messageType?: string | null;
  mediaUrl?: string | null;
};

/**
 * Retorna o texto de preview (máx. 140 chars) ou null quando não há nada
 * exibível — a UI cai no fallback derivado (telefone/data).
 */
export function buildMessagePreview(input: MessagePreviewInput): string | null {
  // Fechamentos de bloco viram espaço antes do strip — senão parágrafos do
  // TipTap colam ("Olá!Segue...") no preview de linha única.
  const withBreaks = (input.content ?? "").replace(
    /<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi,
    " "
  );
  const text = stripMessageHtml(withBreaks)
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 0) {
    if (text.length <= PREVIEW_MAX_LENGTH) return text;
    return `${text.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`;
  }

  const type = input.messageType?.toLowerCase() ?? null;
  if (type) {
    for (const [types, label] of MEDIA_TYPE_LABELS) {
      if (types.has(type)) return label;
    }
  }
  if (input.mediaUrl) return "[Mídia]";
  return null;
}
