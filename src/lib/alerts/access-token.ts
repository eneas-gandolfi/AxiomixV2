/**
 * Arquivo: src/lib/alerts/access-token.ts
 * Propósito: Gerar e validar tokens assinados para links públicos de alertas.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type WhatsappAlertAccessPayload = {
  kind: "whatsapp_conversation";
  companyId: string;
  conversationId: string;
  exp: number;
};

function getAlertLinkSecret() {
  const rawSecret =
    process.env.ALERT_LINK_SECRET?.trim() ||
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawSecret) {
    throw new Error(
      "Configure ALERT_LINK_SECRET ou INTEGRATIONS_ENCRYPTION_KEY para gerar links públicos de alerta."
    );
  }

  return createHash("sha256").update(rawSecret).digest();
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getAlertLinkSecret())
    .update(`${TOKEN_VERSION}.${encodedPayload}`)
    .digest("base64url");
}

function parsePayload(encodedPayload: string): WhatsappAlertAccessPayload {
  const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
  const parsed = JSON.parse(decoded) as Partial<WhatsappAlertAccessPayload>;

  if (
    parsed.kind !== "whatsapp_conversation" ||
    typeof parsed.companyId !== "string" ||
    parsed.companyId.trim().length === 0 ||
    typeof parsed.conversationId !== "string" ||
    parsed.conversationId.trim().length === 0 ||
    typeof parsed.exp !== "number"
  ) {
    throw new Error("Payload de alerta inválido.");
  }

  return {
    kind: parsed.kind,
    companyId: parsed.companyId,
    conversationId: parsed.conversationId,
    exp: parsed.exp,
  };
}

export function createWhatsappAlertAccessToken(input: {
  companyId: string;
  conversationId: string;
  ttlMs?: number;
}) {
  const payload: WhatsappAlertAccessPayload = {
    kind: "whatsapp_conversation",
    companyId: input.companyId,
    conversationId: input.conversationId,
    exp: Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${TOKEN_VERSION}.${encodedPayload}.${signature}`;
}

export function verifyWhatsappAlertAccessToken(token: string): WhatsappAlertAccessPayload {
  const [version, encodedPayload, signature, ...rest] = token.split(".");

  if (
    version !== TOKEN_VERSION ||
    !encodedPayload ||
    !signature ||
    rest.length > 0
  ) {
    throw new Error("Formato de token inválido.");
  }

  const expectedSignature = signPayload(encodedPayload);
  const isValidSignature =
    expectedSignature.length === signature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!isValidSignature) {
    throw new Error("Assinatura de token inválida.");
  }

  const payload = parsePayload(encodedPayload);

  if (payload.exp <= Date.now()) {
    throw new Error("Token de alerta expirado.");
  }

  return payload;
}
