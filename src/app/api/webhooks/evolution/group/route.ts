/**
 * Arquivo: src/app/api/webhooks/evolution/group/route.ts
 * Propósito: Webhook da Evolution API para receber mensagens de grupos WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";
import {
  webhookPayloadSchema,
  normalizeEvolutionPayload,
  extractTextContent,
  isMediaMessage,
  extractMediaMimetype,
  isGroupJid,
  detectTrigger,
  resolveTimestamp,
  handleMessageStatusUpdate,
  handleGroupsUpsert,
  isBotEcho,
  resolveCompanyId,
  resolveGroupConfig,
  processMedia,
  triggerAgentResponse,
} from "@/services/group-agent/webhook-handler";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[webhook/group]";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const rateLimited = await applyIpRateLimit(request, "webhook:group", 120, 60);
    if (rateLimited) return rateLimited;

    const url = request.nextUrl.toString();
    const token = request.nextUrl.searchParams.get("token");
    const cidParam = request.nextUrl.searchParams.get("cid");

    console.log(LOG_PREFIX, "POST recebido", {
      url: url.replace(/token=[^&]+/, "token=***"),
      cid: cidParam ?? "(none)",
      timestamp: new Date().toISOString(),
    });

    // --- Token validation ---
    const expectedToken = process.env.EVOLUTION_WEBHOOK_API_KEY?.trim();
    if (!expectedToken) {
      console.warn(LOG_PREFIX, "EVOLUTION_WEBHOOK_API_KEY não definido no servidor!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (token !== expectedToken) {
      console.warn(LOG_PREFIX, "Token mismatch", {
        received: token ? `${token.slice(0, 6)}...` : "(empty)",
        expected: `${expectedToken.slice(0, 6)}...`,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse body ---
    const rawBody: unknown = await request.json().catch((err) => {
      console.error(LOG_PREFIX, "Falha ao parsear JSON body:", err);
      return null;
    });
    if (!rawBody) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const topKeys = typeof rawBody === "object" && rawBody !== null ? Object.keys(rawBody) : [];
    const rawEvent = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>).event : undefined;
    console.log(LOG_PREFIX, "Raw payload recebido", {
      topKeys, event: rawEvent,
      dataIsArray: Array.isArray((rawBody as Record<string, unknown>).data),
      instanceType: typeof (rawBody as Record<string, unknown>).instance,
    });

    // --- Dispatch by event type ---
    const supabase = createSupabaseAdminClient();

    if (rawEvent === "groups.upsert") {
      const result = await handleGroupsUpsert((rawBody as Record<string, unknown>).data, supabase);
      return NextResponse.json(result);
    }

    if (rawEvent === "messages.update") {
      const result = await handleMessageStatusUpdate((rawBody as Record<string, unknown>).data, supabase);
      return NextResponse.json(result);
    }

    if (rawEvent === "connection.update") {
      return NextResponse.json({ ok: true, skipped: "connection_update" });
    }

    // --- Parse message payload ---
    const normalizedBody = typeof rawBody === "object" && rawBody !== null
      ? normalizeEvolutionPayload(rawBody as Record<string, unknown>)
      : rawBody;

    const parsed = webhookPayloadSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      console.warn(LOG_PREFIX, "Zod parse falhou", {
        errors: parsed.error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
        bodyPreview: JSON.stringify(normalizedBody).slice(0, 500),
      });
      return NextResponse.json({ ok: false, skipped: "payload_invalid", reason: "Zod validation failed" }, { status: 400 });
    }

    const { data } = parsed.data;
    const remoteJid = data.key.remoteJid;

    console.log(LOG_PREFIX, "Parse OK", {
      event: parsed.data.event, instance: parsed.data.instance, remoteJid,
      fromMe: data.key.fromMe,
      hasContent: !!(data.message?.conversation || data.message?.extendedTextMessage?.text),
      hasMedia: isMediaMessage(data.message), messageType: data.messageType,
      participant: data.key.participant, pushName: data.pushName,
    });

    // --- Group check ---
    if (!isGroupJid(remoteJid)) {
      return NextResponse.json({ ok: true, skipped: "not_group" });
    }

    // --- Bot echo detection ---
    if (data.key.fromMe) {
      const echo = await isBotEcho(remoteJid, extractTextContent(data.message), supabase);
      if (echo.isEcho) {
        console.log(LOG_PREFIX, `Ignorando: ${echo.reason}`, { remoteJid });
        return NextResponse.json({ ok: true, skipped: echo.reason });
      }
      console.log(LOG_PREFIX, "fromMe=true mas não é eco do bot, processando como mensagem do dono", { remoteJid });
    }

    // --- Extract message fields ---
    const senderJid = data.key.participant ?? data.key.remoteJid;
    const content = extractTextContent(data.message);
    const messageId = data.key.id;
    const senderName = data.pushName ?? null;
    const messageType = data.messageType ?? "text";
    const sentAt = resolveTimestamp(data.messageTimestamp);

    // --- Resolve company ---
    const resolvedCompanyId = await resolveCompanyId(cidParam, supabase);
    if (cidParam && !resolvedCompanyId) {
      return NextResponse.json({ ok: true, skipped: "invalid_cid" });
    }

    // --- Resolve config (auto-register if needed) ---
    const config = await resolveGroupConfig(remoteJid, resolvedCompanyId, supabase);
    if (!config) {
      return NextResponse.json({ ok: true, skipped: "no_company" });
    }

    // --- Inactive group: save message only ---
    if (!config.is_active) {
      console.log(LOG_PREFIX, "Grupo inativo, salvando mensagem sem processar trigger", { configId: config.id, remoteJid });
      await supabase.from("group_messages").upsert(
        { company_id: config.company_id, config_id: config.id, group_jid: remoteJid, sender_jid: senderJid, sender_name: senderName, message_id: messageId, content, message_type: messageType, is_trigger: false, sent_at: sentAt },
        { onConflict: "company_id,message_id", ignoreDuplicates: true }
      );
      return NextResponse.json({ ok: true, registered: true, active: false });
    }

    // --- Media processing ---
    const { processedContent, finalMessageType } = await processMedia({
      message: data.message,
      messageType,
      mediaMimetype: extractMediaMimetype(data.message),
      config,
      instance: parsed.data.instance,
      messageKey: { remoteJid: data.key.remoteJid, id: data.key.id, fromMe: data.key.fromMe, participant: data.key.participant },
      content,
      messageId,
      remoteJid,
      supabase,
    });

    // --- Save message ---
    const isTrigger = processedContent ? detectTrigger(processedContent, config.trigger_keywords) : false;

    const { error: insertError } = await supabase.from("group_messages").upsert(
      { company_id: config.company_id, config_id: config.id, group_jid: remoteJid, sender_jid: senderJid, sender_name: senderName, message_id: messageId, content: processedContent, message_type: finalMessageType, is_trigger: isTrigger, sent_at: sentAt },
      { onConflict: "company_id,message_id", ignoreDuplicates: true }
    );

    if (insertError) {
      console.error(LOG_PREFIX, "Falha ao inserir mensagem:", { error: insertError.message, code: insertError.code, messageId, remoteJid, configId: config.id });
      return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // --- Trigger agent response ---
    await triggerAgentResponse({ config, messageId, processedContent, senderJid, remoteJid, finalIsTrigger: isTrigger, supabase });

    const elapsed = Date.now() - startTime;
    console.log(LOG_PREFIX, "Concluído", { elapsed: `${elapsed}ms`, trigger: isTrigger });
    return NextResponse.json({ ok: true, trigger: isTrigger });
  } catch (error) {
    console.error(LOG_PREFIX, "Erro inesperado:", {
      error: error instanceof Error ? error.stack ?? error.message : error,
      elapsed: `${Date.now() - startTime}ms`,
    });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
