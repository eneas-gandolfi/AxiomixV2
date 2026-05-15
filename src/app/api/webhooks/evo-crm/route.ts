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
 *     { event: "message_created" | "conversation_created" | "conversation_updated" |
 *              "conversation_status_changed" | "contact_created" | "contact_updated" | ...,
 *       data: {...} }
 *   Validação: HMAC-SHA256 do body com `webhookSecret` da integração → header `X-Evo-Signature`.
 *
 * Validado 2026-04-29: webhook criado via API /api/v1/webhooks, tipo account_type.
 * Notas sobre formato da API real:
 *   - contact.phone_number (não phone ou phone_e164)
 *   - timestamps podem ser Unix epoch (números)
 *   - message_type: "incoming" | "outgoing" (não from_me boolean)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAgentActivity } from "@/lib/whatsapp/agent-activity";
import { computeMessageFingerprint } from "@/lib/whatsapp/message-fingerprint";
import { stripMessageHtml } from "@/lib/whatsapp/strip-message-html";
import { handleCrmLabelAlert } from "@/services/bridge/crm-to-group-alerts";

/**
 * Tenta extrair o agent_id (UUID do Evo CRM) que emitiu uma mensagem outbound.
 * Cobre formatos prováveis do payload (Chatwoot/Evo CRM costumam expor sender com
 * type 'agent_bot' ou similares, ou agent_id direto em content_attributes).
 * Retorna null se não houver indício seguro de origem agent — assim nunca
 * registramos message_handled para mensagens humanas.
 */
function extractMessageAgentId(data: Record<string, unknown>): string | null {
  const sender = typeof data.sender === "object" && data.sender !== null
    ? (data.sender as Record<string, unknown>)
    : null;
  const senderType = typeof data.sender_type === "string"
    ? data.sender_type.toLowerCase()
    : sender && typeof sender.type === "string"
      ? (sender.type as string).toLowerCase()
      : null;

  const looksLikeAgent =
    senderType !== null &&
    (senderType.includes("agent") || senderType === "bot" || senderType.includes("ai"));

  if (looksLikeAgent && sender) {
    const id = sender.id ?? sender.agent_id ?? sender.uuid;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }

  const contentAttrs = typeof data.content_attributes === "object" && data.content_attributes !== null
    ? (data.content_attributes as Record<string, unknown>)
    : null;
  if (contentAttrs) {
    const id = contentAttrs.agent_id ?? contentAttrs.agentId;
    if (typeof id === "string") return id;
  }

  const additionalAttrs = typeof data.additional_attributes === "object" && data.additional_attributes !== null
    ? (data.additional_attributes as Record<string, unknown>)
    : null;
  if (additionalAttrs) {
    const id = additionalAttrs.agent_id ?? additionalAttrs.agentId;
    if (typeof id === "string") return id;
  }

  return null;
}

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

function epochToIso(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return new Date(n < 1e12 ? n * 1000 : n).toISOString();
    }
    return trimmed;
  }
  if (typeof value === "number" && value > 0) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  return new Date().toISOString();
}

// O Evo CRM (evo-ai-crm-community, herdado do Chatwoot) serializa o webhook como:
//   message_created: { id, content, message_type, conversation: { id, display_id, meta:{sender} }, sender, inbox, ... }
//   conversation_*:  { id, display_id, inbox_id, labels, meta:{sender}, status, ... }
// O handler antigo lia campos top-level (`data.conversation_id`, `data.contact`) que NÃO existem
// nesses payloads. Extrair via helpers blindados a ambos formatos (aninhado e legado).
function extractConversationId(data: Record<string, unknown>): string | null {
  const conv =
    typeof data.conversation === "object" && data.conversation !== null
      ? (data.conversation as Record<string, unknown>)
      : null;
  if (conv && (typeof conv.id === "string" || typeof conv.id === "number")) {
    return String(conv.id);
  }
  if (typeof data.conversation_id === "string" || typeof data.conversation_id === "number") {
    return String(data.conversation_id);
  }
  return null;
}

function extractContactRaw(data: Record<string, unknown>): Record<string, unknown> | null {
  // conversation events: data.meta.sender
  const meta =
    typeof data.meta === "object" && data.meta !== null
      ? (data.meta as Record<string, unknown>)
      : null;
  const metaSender =
    meta && typeof meta.sender === "object" && meta.sender !== null
      ? (meta.sender as Record<string, unknown>)
      : null;
  if (metaSender) return metaSender;
  // message events: data.sender direto
  const directSender =
    typeof data.sender === "object" && data.sender !== null
      ? (data.sender as Record<string, unknown>)
      : null;
  if (directSender) return directSender;
  // message events: data.conversation.meta.sender (mensagem com conversa aninhada)
  const conv =
    typeof data.conversation === "object" && data.conversation !== null
      ? (data.conversation as Record<string, unknown>)
      : null;
  const convMeta =
    conv && typeof conv.meta === "object" && conv.meta !== null
      ? (conv.meta as Record<string, unknown>)
      : null;
  const convSender =
    convMeta && typeof convMeta.sender === "object" && convMeta.sender !== null
      ? (convMeta.sender as Record<string, unknown>)
      : null;
  if (convSender) return convSender;
  // fallback legado
  return typeof data.contact === "object" && data.contact !== null
    ? (data.contact as Record<string, unknown>)
    : null;
}

async function handleMessageEvent(
  companyId: string,
  data: Record<string, unknown>,
  eventName: "created" | "updated" = "created"
) {
  const supabase = createSupabaseAdminClient();
  // Evo CRM envia conversation_id aninhado em data.conversation.id (UUID).
  // Não confundir com data.conversation_id (campo legado/Chatwoot antigo que aqui é undefined).
  const conversationExternalId = extractConversationId(data);

  if (!conversationExternalId) return;

  const msgType = typeof data.message_type === "string" ? data.message_type.toLowerCase() : null;

  // Activity events ("Conversation was reopened by …") não são mensagens reais — ignora.
  if (msgType === "activity") return;

  const rawMessageExternalId =
    typeof data.id === "string" || typeof data.id === "number"
      ? String(data.id)
      : typeof data.message_id === "string"
        ? data.message_id
        : typeof data.uuid === "string"
          ? data.uuid
          : null;

  // Pre-cálculo: direção, sent_at (ISO) e content (HTML-stripped) precisam estar
  // disponíveis ANTES do fingerprint para que o webhook e o sync produzam
  // exatamente os mesmos inputs. Sem isso, mesmo evento gera fingerprints
  // diferentes entre os 2 caminhos e o índice unique parcial não desduplica.
  const directionRaw =
    typeof data.direction === "string" ? data.direction.toLowerCase() : null;
  // Chatwoot/Evo CRM usa message_type numérico (0=incoming, 1=outgoing). Cobrir
  // ambos formatos (numérico e string) para resistir a variações da serialização.
  const fromMe =
    typeof data.from_me === "boolean"
      ? data.from_me
      : data.message_type === 1 ||
        data.message_type === "1" ||
        msgType === "outgoing" ||
        directionRaw === "outbound" ||
        directionRaw === "sent";
  const direction: "inbound" | "outbound" = fromMe ? "outbound" : "inbound";

  const rawContent =
    typeof data.content === "string"
      ? data.content
      : typeof data.body === "string"
        ? data.body
        : typeof data.processed_message_content === "string"
          ? data.processed_message_content
          : "";
  const content = stripMessageHtml(rawContent);
  const sentAt = epochToIso(data.created_at ?? data.sent_at ?? data.timestamp);

  const messageExternalId =
    rawMessageExternalId ??
    computeMessageFingerprint({
      conversationExternalId,
      direction,
      sentAtIso: sentAt,
      content,
    });
  const usedFingerprint = !rawMessageExternalId;

  console.info(
    `[evo-crm webhook] message_${eventName} companyId=${companyId} ` +
      `convExt=${conversationExternalId} msgExt=${messageExternalId}` +
      (usedFingerprint ? " [fingerprint]" : "")
  );

  // message_updated: NUNCA insere. Atualiza status/conteudo se a mensagem ja
  // existir; caso contrario ignora (evita duplicar quando created+updated
  // chegam em sequencia para a mesma mensagem). Sem essa separacao, dois
  // INSERTs entram no banco apesar do indice unico parcial em external_id
  // (race: ambos passam pelo SELECT antes do primeiro fazer COMMIT).
  if (eventName === "updated") {
    if (!messageExternalId) return;
    const { data: existingMsg } = await supabase
      .from("messages")
      .select("id")
      .eq("company_id", companyId)
      .eq("external_id", messageExternalId)
      .maybeSingle();
    if (!existingMsg) return;
    const contentUpdate =
      typeof data.content === "string"
        ? stripMessageHtml(data.content)
        : typeof data.body === "string"
          ? stripMessageHtml(data.body)
          : null;
    const updatePayload: Record<string, unknown> = {};
    if (contentUpdate !== null) updatePayload.content = contentUpdate;
    if (typeof data.message_type === "string") updatePayload.message_type = data.message_type;
    if (typeof data.media_url === "string") updatePayload.media_url = data.media_url;
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.raw_payload = data as Json;
      await supabase.from("messages").update(updatePayload).eq("id", existingMsg.id);
    }
    return;
  }

  // NOTA: removido SELECT prévio. Antes era SELECT + INSERT, mas em race de
  // webhooks concorrentes ambos viam "não existe" antes de qualquer COMMIT e
  // inseriam. Agora confiamos só no INSERT — se for duplicate, o índice unique
  // parcial rejeita com código 23505 e o catch abaixo trata como ignore.

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("company_id", companyId)
    .eq("external_id", conversationExternalId)
    .maybeSingle();

  // Se a conversa ainda não foi criada localmente (race: message_created antes de
  // conversation_created), cria stub aqui e deixa o próximo conversation_updated
  // enriquecer com labels/status. Evita perda silenciosa de mensagem (H1).
  //
  // Extrai contato/inbox do próprio payload de mensagem quando disponível (o Evo CRM
  // envia esses campos junto com message_created), para que o stub NÃO apareça como
  // "unknown" na UI durante a janela entre os 2 webhooks.
  if (!conversation) {
    console.warn(
      `[evo-crm webhook] stub conversation criada — convExt=${conversationExternalId} ` +
        `payload_keys=${Object.keys(data).join(",")}`
    );
    const contactRaw = extractContactRaw(data);
    const stubContactPhone =
      contactRaw && typeof contactRaw.phone_number === "string"
        ? contactRaw.phone_number
        : contactRaw && typeof contactRaw.phone_e164 === "string"
          ? contactRaw.phone_e164
          : contactRaw && typeof contactRaw.phone === "string"
            ? contactRaw.phone
            : null;
    const stubContactName =
      contactRaw && typeof contactRaw.name === "string" && contactRaw.name.trim().length > 0
        ? contactRaw.name
        : null;
    // inbox_id pode vir top-level (legado) ou aninhado em data.conversation.inbox_id
    const conv =
      typeof data.conversation === "object" && data.conversation !== null
        ? (data.conversation as Record<string, unknown>)
        : null;
    const stubInboxId =
      (typeof data.inbox_id === "string" || typeof data.inbox_id === "number"
        ? String(data.inbox_id)
        : null) ??
      (conv && (typeof conv.inbox_id === "string" || typeof conv.inbox_id === "number")
        ? String(conv.inbox_id)
        : null);
    const stub = {
      company_id: companyId,
      external_id: conversationExternalId,
      remote_jid: stubContactPhone ?? "unknown",
      contact_name: stubContactName,
      contact_phone: stubContactPhone,
      contact_external_id:
        contactRaw && (typeof contactRaw.id === "string" || typeof contactRaw.id === "number")
          ? String(contactRaw.id)
          : null,
      status: "open",
      inbox_id: stubInboxId,
      last_synced_at: new Date().toISOString(),
    };
    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert(stub)
      .select("id")
      .single();
    if (createErr || !created) {
      console.error(`[evo-crm webhook] falha criando conversa stub ${conversationExternalId}:`, createErr?.message);
      throw new Error(`Stub conversation insert failed: ${createErr?.message}`);
    }
    conversation = created;
  }

  // direction, content e sentAt já calculados acima (antes do fingerprint).
  const { error: insertErr } = await supabase.from("messages").insert({
    company_id: companyId,
    conversation_id: conversation.id,
    external_id: messageExternalId,
    content,
    direction,
    sent_at: sentAt,
    message_type: typeof data.message_type === "string" ? data.message_type : null,
    media_url: typeof data.media_url === "string" ? data.media_url : null,
    raw_payload: data as Json,
  });
  if (insertErr) {
    // 23505 = unique_violation. Significa que outra requisição (webhook em race
    // ou insert otimista de /send-message) chegou primeiro e já gravou esta
    // mensagem. Idempotência garantida pelo indice unique parcial.
    if (insertErr.code === "23505") {
      console.info(
        `[evo-crm webhook] message duplicate ignorada (23505) msgExt=${messageExternalId}`
      );
      return;
    }
    console.error(`[evo-crm webhook] falha inserindo mensagem ${messageExternalId}:`, insertErr.message);
    throw new Error(`Message insert failed: ${insertErr.message}`);
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: sentAt, last_synced_at: new Date().toISOString() })
    .eq("id", conversation.id);

  // Auditoria: se a mensagem foi emitida por agente IA, registra na timeline do agente.
  if (direction === "outbound" && messageExternalId) {
    const agentId = extractMessageAgentId(data);
    if (agentId) {
      await logAgentActivity(companyId, agentId, {
        type: "message_handled",
        details: {
          conversation_id: conversationExternalId,
          message_id: messageExternalId,
        },
      });
    }
  }
}

async function handleConversationEvent(companyId: string, data: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const externalId =
    typeof data.id === "string" || typeof data.id === "number" ? String(data.id) : null;
  if (!externalId) return;

  // Evo CRM envia contact em data.meta.sender (não em data.contact).
  const contactRaw = extractContactRaw(data);

  const contactPhone =
    contactRaw && typeof contactRaw.phone_number === "string"
      ? contactRaw.phone_number
      : contactRaw && typeof contactRaw.phone_e164 === "string"
        ? contactRaw.phone_e164
        : contactRaw && typeof contactRaw.phone === "string"
          ? contactRaw.phone
          : null;

  // Extrair labels (Evo CRM envia como array de strings ou objetos com title)
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  const labels = rawLabels
    .map((l: unknown) => {
      if (typeof l === "string") return l;
      if (typeof l === "object" && l !== null) {
        const obj = l as Record<string, unknown>;
        return typeof obj.title === "string" ? obj.title : typeof obj.name === "string" ? obj.name : null;
      }
      return null;
    })
    .filter((l): l is string => l !== null);

  const inboxRaw =
    typeof data.inbox === "object" && data.inbox !== null
      ? (data.inbox as Record<string, unknown>)
      : null;
  const inboxId =
    (typeof data.inbox_id === "string" || typeof data.inbox_id === "number"
      ? String(data.inbox_id)
      : null) ??
    (inboxRaw && (typeof inboxRaw.id === "string" || typeof inboxRaw.id === "number")
      ? String(inboxRaw.id)
      : null);

  const contactName =
    contactRaw && typeof contactRaw.name === "string" && contactRaw.name.trim().length > 0
      ? contactRaw.name
      : null;
  const contactExternalId =
    contactRaw && (typeof contactRaw.id === "string" || typeof contactRaw.id === "number")
      ? String(contactRaw.id)
      : null;

  // SELECT prévio para merge defensivo: nunca sobrescrever contact_name/phone com
  // null quando o existing já tinha valor — webhooks podem chegar com payload
  // incompleto e zerar dados corretos sem isso.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, contact_name, contact_phone, contact_external_id, remote_jid")
    .eq("company_id", companyId)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing && contactName === null && existing.contact_name) {
    console.info(
      `[evo-crm webhook] conversation_event preservou contact_name existente (payload sem sender) — externalId=${externalId}`
    );
  }

  const resolvedRemoteJid =
    contactPhone ??
    (typeof data.phone_e164 === "string" ? data.phone_e164 : null) ??
    (typeof data.remote_jid === "string" ? data.remote_jid : null) ??
    existing?.remote_jid ??
    "unknown";

  const payload = {
    company_id: companyId,
    external_id: externalId,
    remote_jid: resolvedRemoteJid,
    contact_name: contactName ?? existing?.contact_name ?? null,
    contact_phone: contactPhone ?? existing?.contact_phone ?? null,
    contact_external_id: contactExternalId ?? existing?.contact_external_id ?? null,
    status: typeof data.status === "string" ? data.status : "open",
    inbox_id: inboxId,
    last_message_at: epochToIso(data.last_message_at ?? data.last_activity_at),
    last_synced_at: new Date().toISOString(),
    labels: labels.length > 0 ? labels : null,
  };

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
        await handleMessageEvent(companyId, data, "created");
        break;

      case "message_updated":
      case "message.updated":
        // Update-only: NUNCA insere, apenas atualiza se já existir.
        // Crítico para evitar duplicação quando created+updated chegam em
        // rajada (~1s de diferença observado em prod 2026-05-15).
        await handleMessageEvent(companyId, data, "updated");
        break;

      case "conversation_created":
      case "conversation.created":
      case "conversation_updated":
      case "conversation.updated":
      case "conversation_status_changed":
        await handleConversationEvent(companyId, data);
        // Alertas de labels de risco → grupo do time (best-effort, não bloqueia)
        try {
          const labels = Array.isArray(data.labels)
            ? data.labels.filter((l): l is string => typeof l === "string")
            : [];
          if (labels.length > 0) {
            const contactRaw = typeof data.contact === "object" && data.contact !== null
              ? (data.contact as Record<string, unknown>)
              : null;
            void handleCrmLabelAlert(companyId, {
              conversationId: typeof data.id === "string" ? data.id : String(data.id ?? ""),
              contactName: contactRaw && typeof contactRaw.name === "string" ? contactRaw.name : "Desconhecido",
              contactPhone: contactRaw && typeof contactRaw.phone_number === "string"
                ? contactRaw.phone_number
                : null,
              labels,
              assigneeName: null,
            });
          }
        } catch {
          // Best-effort — falha silenciosa para não quebrar o webhook
        }
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
