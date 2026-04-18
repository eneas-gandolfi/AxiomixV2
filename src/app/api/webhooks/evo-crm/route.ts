/**
 * Arquivo: src/app/api/webhooks/evo-crm/route.ts
 * Propósito: Receber eventos em tempo real do Evo CRM (conversations, messages, contacts)
 *            e persistir no banco local sem depender de polling.
 * Autor: AXIOMIX
 * Data: 2026-04-17
 *
 * Fluxo:
 *   Evo CRM → POST /api/webhooks/evo-crm?companyId={uuid}
 *   Payload (envelope padrão Evo):
 *     { event: "message_created" | "conversation_created" | "contact_updated" | ...,
 *       data: {...} }
 *   Validação: HMAC-SHA256 do body com `webhookSecret` da integração → header `X-Evo-Signature`.
 *
 * UNVERIFIED: shape exato do payload + nome do header de assinatura ainda precisa
 * ser validado contra o Evo CRM com token válido (ver plan). Implementação atual
 * aceita múltiplos formatos comuns Chatwoot-like.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type EvoWebhookEnvelope = {
  event?: string;
  type?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

function validateSignature(body: string, secret: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(signature, "utf-8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractEventName(payload: EvoWebhookEnvelope): string {
  return (typeof payload.event === "string" ? payload.event : payload.type) ?? "unknown";
}

function extractData(payload: EvoWebhookEnvelope): Record<string, unknown> {
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.payload && typeof payload.payload === "object") return payload.payload;
  return payload as Record<string, unknown>;
}

async function loadWebhookSecret(companyId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evo_crm")
    .maybeSingle();

  if (!integration?.config) return null;

  try {
    const config = decodeIntegrationConfig("evo_crm", integration.config as Json);
    return config.webhookSecret ?? null;
  } catch {
    return null;
  }
}

async function handleMessageEvent(companyId: string, data: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const conversationExternalId =
    typeof data.conversation_id === "string" || typeof data.conversation_id === "number"
      ? String(data.conversation_id)
      : null;

  if (!conversationExternalId) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("external_id", conversationExternalId)
    .maybeSingle();

  if (!conversation) return;

  const directionRaw =
    typeof data.direction === "string" ? data.direction.toLowerCase() : null;
  const fromMe =
    typeof data.from_me === "boolean"
      ? data.from_me
      : directionRaw === "outbound" || directionRaw === "sent";

  const content =
    typeof data.content === "string"
      ? data.content
      : typeof data.body === "string"
        ? data.body
        : "";

  const sentAt =
    typeof data.created_at === "string"
      ? data.created_at
      : new Date().toISOString();

  await supabase.from("messages").insert({
    company_id: companyId,
    conversation_id: conversation.id,
    content,
    direction: fromMe ? "outbound" : "inbound",
    sent_at: sentAt,
    message_type: typeof data.message_type === "string" ? data.message_type : null,
    media_url: typeof data.media_url === "string" ? data.media_url : null,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: sentAt, last_synced_at: new Date().toISOString() })
    .eq("id", conversation.id);
}

async function handleConversationEvent(companyId: string, data: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const externalId =
    typeof data.id === "string" || typeof data.id === "number" ? String(data.id) : null;
  if (!externalId) return;

  const contactRaw =
    typeof data.contact === "object" && data.contact !== null
      ? (data.contact as Record<string, unknown>)
      : null;

  const payload = {
    company_id: companyId,
    external_id: externalId,
    remote_jid:
      (typeof data.phone_e164 === "string" ? data.phone_e164 : null) ??
      (typeof data.remote_jid === "string" ? data.remote_jid : null) ??
      (contactRaw && typeof contactRaw.phone === "string" ? contactRaw.phone : null) ??
      "unknown",
    contact_name: contactRaw && typeof contactRaw.name === "string" ? contactRaw.name : null,
    contact_phone:
      contactRaw && typeof contactRaw.phone_e164 === "string"
        ? contactRaw.phone_e164
        : contactRaw && typeof contactRaw.phone === "string"
          ? contactRaw.phone
          : null,
    contact_external_id:
      contactRaw && (typeof contactRaw.id === "string" || typeof contactRaw.id === "number")
        ? String(contactRaw.id)
        : null,
    status: typeof data.status === "string" ? data.status : "open",
    last_message_at:
      typeof data.last_message_at === "string" ? data.last_message_at : null,
    last_synced_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    await supabase.from("conversations").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("conversations").insert(payload);
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId ausente na querystring" },
        { status: 400 }
      );
    }

    const body = await request.text();

    // Assinatura HMAC (se configurada)
    const secret = await loadWebhookSecret(companyId);
    if (secret) {
      const signature =
        request.headers.get("x-evo-signature") ??
        request.headers.get("x-webhook-signature") ??
        request.headers.get("x-hub-signature-256");
      if (!validateSignature(body, secret, signature)) {
        return NextResponse.json(
          { success: false, error: "Assinatura de webhook inválida" },
          { status: 401 }
        );
      }
    }

    let payload: EvoWebhookEnvelope;
    try {
      payload = JSON.parse(body) as EvoWebhookEnvelope;
    } catch {
      return NextResponse.json(
        { success: false, error: "Body não é JSON válido" },
        { status: 400 }
      );
    }

    const event = extractEventName(payload);
    const data = extractData(payload);

    switch (event) {
      case "message_created":
      case "message.created":
      case "message_updated":
        await handleMessageEvent(companyId, data);
        break;

      case "conversation_created":
      case "conversation.created":
      case "conversation_updated":
      case "conversation.updated":
      case "conversation_status_changed":
        await handleConversationEvent(companyId, data);
        break;

      case "contact_created":
      case "contact_updated":
        // Contatos atualizados refletem ao próximo sync — não há tabela `contacts` local dedicada.
        break;

      default:
        console.warn(`[evo-crm webhook] Evento não tratado: ${event}`);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("[evo-crm webhook] erro ao processar:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "erro desconhecido",
      },
      { status: 500 }
    );
  }
}
