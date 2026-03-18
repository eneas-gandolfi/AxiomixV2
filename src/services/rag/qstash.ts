/**
 * Arquivo: src/services/rag/qstash.ts
 * Propósito: Agendar processamento RAG via QStash (background callback).
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { Client } from "@upstash/qstash";

type RagProcessPayload = {
  documentId: string;
  companyId: string;
};

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN não configurado.");
  }

  return new Client({
    token,
  });
}

function resolveAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL não configurada.");
  }

  return appUrl.replace(/\/+$/, "");
}

export async function scheduleRagProcessing(payload: RagProcessPayload) {
  const qstash = getQStashClient();
  const url = `${resolveAppUrl()}/api/rag/process`;

  const result = await qstash.publishJSON({
    url,
    body: {
      documentId: payload.documentId,
      companyId: payload.companyId,
    },
    retries: 3,
    timeout: 300,
    label: "axiomix-rag-process",
  });

  return {
    messageId: result.messageId,
    url,
  };
}
