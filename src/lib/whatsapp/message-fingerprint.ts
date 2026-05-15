/**
 * Arquivo: src/lib/whatsapp/message-fingerprint.ts
 * Propósito: Fingerprint determinístico de mensagens WhatsApp para idempotência
 *            cross-caminho (webhook do Evo CRM + sync REST + send-message otimista).
 *
 * Critério: dada a mesma mensagem (conversa, direção, instante, conteúdo) qualquer
 * caminho de gravação deve produzir o MESMO fingerprint. Assim o índice unique
 * parcial em (company_id, external_id) where external_id is not null rejeita o
 * segundo INSERT com código 23505, eliminando duplicatas mesmo quando o Evo CRM
 * dispara webhooks em rajada ou quando o poll REST corre em paralelo.
 *
 * Não confundir com `buildMessageFingerprint` em `src/services/evo-crm/conversations.ts`
 * — aquele é apenas dedup intra-batch in-memory e usa formato diferente. Este é o
 * fingerprint *persistente*, gravado como `external_id`.
 *
 * Autor: AXIOMIX
 * Data: 2026-05-15
 */

import { createHash } from "node:crypto";

export type MessageFingerprintInput = {
  conversationExternalId: string;
  direction: "inbound" | "outbound";
  /** Timestamp ISO 8601 — converter epoch para ISO antes de passar. */
  sentAtIso: string;
  content: string;
};

export function computeMessageFingerprint(params: MessageFingerprintInput): string {
  const hash = createHash("sha1")
    .update(
      `${params.conversationExternalId}|${params.direction}|${params.sentAtIso}|${params.content}`
    )
    .digest("hex")
    .slice(0, 32);
  return `fp:${hash}`;
}
