/**
 * Arquivo: src/services/group-agent/webhook-handler.ts
 * Propósito: Lógica de negócio extraída do webhook de grupo Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-04-10
 */

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processGroupAgentResponse } from "@/services/group-agent/responder";
import {
  resolveEvolutionCredentials,
  fetchEvolutionGroups,
  resolvePreferredEvolutionInstance,
  downloadEvolutionMedia,
} from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import {
  resolveMediaType,
  isPdfDocument,
  processMediaMessage,
} from "@/services/group-agent/media-processor";

const LOG_PREFIX = "[webhook/group]";

/* ------------------------------------------------------------------ */
/*  Schema & types                                                     */
/* ------------------------------------------------------------------ */

export const webhookPayloadSchema = z.object({
  event: z.string(),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string(),
      participant: z.string().optional(),
    }),
    pushName: z.string().optional(),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z.object({ text: z.string().optional() }).optional(),
        imageMessage: z.object({ caption: z.string().optional(), mimetype: z.string().optional(), url: z.string().optional() }).optional(),
        audioMessage: z.object({ mimetype: z.string().optional(), ptt: z.boolean().optional(), url: z.string().optional() }).optional(),
        documentMessage: z.object({ caption: z.string().optional(), mimetype: z.string().optional(), fileName: z.string().optional(), url: z.string().optional() }).optional(),
        documentWithCaptionMessage: z.object({
          message: z.object({
            documentMessage: z.object({ caption: z.string().optional(), mimetype: z.string().optional(), fileName: z.string().optional(), url: z.string().optional() }).optional(),
          }).optional(),
        }).optional(),
        stickerMessage: z.object({}).optional(),
      })
      .optional(),
    messageType: z.string().optional(),
    messageTimestamp: z.union([z.number(), z.string()]).optional(),
  }),
});

export type ParsedMessage = z.infer<typeof webhookPayloadSchema>["data"]["message"];

/* ------------------------------------------------------------------ */
/*  Message parsing helpers                                            */
/* ------------------------------------------------------------------ */

export function extractTextContent(message: ParsedMessage): string | null {
  if (!message) return null;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.documentMessage?.caption ??
    message.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    null
  );
}

export function isMediaMessage(message: ParsedMessage): boolean {
  if (!message) return false;
  return !!(
    message.imageMessage ||
    message.audioMessage ||
    message.documentMessage ||
    message.documentWithCaptionMessage?.message?.documentMessage ||
    message.stickerMessage
  );
}

export function extractMediaMimetype(message: ParsedMessage): string | null {
  if (!message) return null;
  return (
    message.imageMessage?.mimetype ??
    message.audioMessage?.mimetype ??
    message.documentMessage?.mimetype ??
    message.documentWithCaptionMessage?.message?.documentMessage?.mimetype ??
    null
  );
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

export function detectTrigger(content: string, triggerKeywords: string[]): boolean {
  const normalized = content.toLowerCase().trim();
  return triggerKeywords.some((keyword) => {
    const k = keyword.toLowerCase().trim();
    return normalized.startsWith(k) || normalized.includes(` ${k}`) || normalized.includes(`\n${k}`);
  });
}

export function resolveTimestamp(raw: number | string | undefined): string {
  if (!raw) return new Date().toISOString();
  const ts = typeof raw === "string" ? Number(raw) : raw;
  if (ts > 1e12) return new Date(ts).toISOString();
  return new Date(ts * 1000).toISOString();
}

/* ------------------------------------------------------------------ */
/*  Payload normalization                                              */
/* ------------------------------------------------------------------ */

export function normalizeEvolutionPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...raw };

  if (Array.isArray(normalized.data)) {
    console.log(LOG_PREFIX, "data is array, using data[0]");
    normalized.data = normalized.data[0] ?? {};
  }

  if (
    normalized.instance &&
    typeof normalized.instance === "object" &&
    !Array.isArray(normalized.instance) &&
    "instanceName" in (normalized.instance as Record<string, unknown>)
  ) {
    const instanceObj = normalized.instance as Record<string, unknown>;
    console.log(LOG_PREFIX, "instance is object, extracting instanceName:", instanceObj.instanceName);
    normalized.instance = instanceObj.instanceName as string;
  }

  return normalized;
}

/* ------------------------------------------------------------------ */
/*  Event handlers                                                     */
/* ------------------------------------------------------------------ */

const EVOLUTION_STATUS_MAP: Record<number, string> = {
  2: "sent_to_provider",
  3: "delivered",
  4: "read",
};

export async function handleMessageStatusUpdate(
  rawData: unknown,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<{ ok: boolean; delivery_updated: number }> {
  const items = Array.isArray(rawData) ? rawData : [rawData];
  let updated = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const key = rec.key as Record<string, unknown> | undefined;
    const statusNum = typeof rec.status === "number" ? rec.status : null;
    if (!key || !statusNum) continue;

    const messageId = typeof key.id === "string" ? key.id : null;
    if (!messageId) continue;

    const deliveryStatus = EVOLUTION_STATUS_MAP[statusNum];
    if (!deliveryStatus) continue;

    const { error, count } = await supabase
      .from("campaign_recipients")
      .update({ delivery_status: deliveryStatus, delivery_updated_at: new Date().toISOString() })
      .eq("provider_message_id", messageId);

    if (!error && count && count > 0) updated++;
  }

  if (updated > 0) {
    console.log(LOG_PREFIX, `Delivery status atualizado para ${updated} recipient(s)`);
  }

  return { ok: true, delivery_updated: updated };
}

export async function handleGroupsUpsert(
  rawData: unknown,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<{ ok: boolean; groups_updated: number }> {
  const items = Array.isArray(rawData) ? rawData : [rawData];
  let updated = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : null;
    const subject = typeof rec.subject === "string" ? rec.subject : null;
    if (!id || !subject || !id.endsWith("@g.us")) continue;

    const { error } = await supabase.from("group_agent_configs").update({ group_name: subject }).eq("group_jid", id);
    if (!error) {
      updated++;
      console.log(LOG_PREFIX, "group_name atualizado via GROUPS_UPSERT", { jid: id, subject });
    }
  }

  return { ok: true, groups_updated: updated };
}

/* ------------------------------------------------------------------ */
/*  Bot echo detection                                                 */
/* ------------------------------------------------------------------ */

export async function isBotEcho(
  remoteJid: string,
  msgContent: string | null,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<{ isEcho: boolean; reason?: string }> {
  if (!msgContent) return { isEcho: true, reason: "from_me_no_content" };

  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
  const { data: recentBotResponse } = await supabase
    .from("group_agent_responses")
    .select("response_text")
    .eq("group_jid", remoteJid)
    .gte("created_at", thirtySecondsAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentBotResponse) {
    const normalizedMsg = msgContent.trim().toLowerCase();
    const normalizedBot = recentBotResponse.response_text.trim().toLowerCase();
    if (normalizedBot.includes(normalizedMsg) || normalizedMsg.includes(normalizedBot)) {
      return { isEcho: true, reason: "bot_echo" };
    }
  }

  return { isEcho: false };
}

/* ------------------------------------------------------------------ */
/*  Company resolution                                                 */
/* ------------------------------------------------------------------ */

export async function resolveCompanyId(
  cidParam: string | null,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<string | null> {
  if (!cidParam) return null;

  const { data: cidIntegration } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("company_id", cidParam)
    .eq("type", "evolution_api")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!cidIntegration) {
    console.warn(LOG_PREFIX, "cid inválido: nenhuma integração evolution_api ativa para company_id", { cid: cidParam });
    return null;
  }

  console.log(LOG_PREFIX, "company_id via cid param:", cidIntegration.company_id);
  return cidIntegration.company_id;
}

/* ------------------------------------------------------------------ */
/*  Group config resolution & auto-register                            */
/* ------------------------------------------------------------------ */

type GroupConfig = {
  id: string;
  company_id: string;
  trigger_keywords: string[];
  is_active: boolean;
  group_name: string | null;
};

async function fetchGroupNameFromApi(
  groupJid: string,
  companyId: string,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<string | null> {
  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", companyId)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration?.config) return null;

    const decoded = decodeIntegrationConfig("evolution_api", integration.config);
    const credentials = resolveEvolutionCredentials({ baseUrl: decoded.baseUrl, apiKey: decoded.apiKey });
    const instanceName = resolvePreferredEvolutionInstance(decoded.vendors) ?? process.env.EVOLUTION_INSTANCE_NAME?.trim() ?? "axiomix-default";
    const groups = await fetchEvolutionGroups({ credentials, instanceName });
    const match = groups.find((g) => g.id === groupJid);

    if (match) {
      console.log(LOG_PREFIX, "Nome real do grupo obtido via API:", match.subject);
      return match.subject;
    }
  } catch (err) {
    console.warn(LOG_PREFIX, "Falha ao buscar nome do grupo via API (best-effort):", err instanceof Error ? err.message : err);
  }
  return null;
}

export async function resolveGroupConfig(
  remoteJid: string,
  resolvedCompanyId: string | null,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<GroupConfig | null> {
  const configQuery = supabase
    .from("group_agent_configs")
    .select("id, company_id, trigger_keywords, is_active, group_name")
    .eq("group_jid", remoteJid)
    .limit(1);

  if (resolvedCompanyId) configQuery.eq("company_id", resolvedCompanyId);

  const { data: config } = await configQuery.maybeSingle();
  if (config) return config;

  // Auto-register
  console.log(LOG_PREFIX, "Grupo não encontrado, tentando auto-registrar", { remoteJid });

  let companyId: string;
  if (resolvedCompanyId) {
    companyId = resolvedCompanyId;
  } else {
    const { data: integration } = await supabase
      .from("integrations")
      .select("company_id")
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!integration?.company_id) {
      console.warn(LOG_PREFIX, "Nenhuma integração evolution_api ativa encontrada!", { remoteJid });
      return null;
    }
    companyId = integration.company_id;
    console.log(LOG_PREFIX, "company_id via fallback (primeira integração ativa):", companyId);
  }

  const realGroupName = await fetchGroupNameFromApi(remoteJid, companyId, supabase);
  const groupName = realGroupName ?? `Grupo ${remoteJid.split("@")[0].slice(-6)}`;

  const { data: newConfig, error: upsertError } = await supabase
    .from("group_agent_configs")
    .upsert(
      { company_id: companyId, group_jid: remoteJid, group_name: groupName, is_active: false },
      { onConflict: "company_id,group_jid" }
    )
    .select("id, company_id, trigger_keywords, is_active, group_name")
    .maybeSingle();

  if (!newConfig) {
    console.error(LOG_PREFIX, "Auto-register falhou!", { remoteJid, companyId, error: upsertError?.message ?? "sem resposta do upsert" });
    return null;
  }

  console.log(LOG_PREFIX, "Grupo auto-registrado com sucesso", {
    configId: newConfig.id, companyId: newConfig.company_id, groupJid: remoteJid, groupName: newConfig.group_name,
  });

  return newConfig;
}

/* ------------------------------------------------------------------ */
/*  Media processing                                                   */
/* ------------------------------------------------------------------ */

export async function processMedia(params: {
  message: ParsedMessage;
  messageType: string;
  mediaMimetype: string | null;
  config: GroupConfig;
  instance: string | undefined;
  messageKey: { remoteJid: string; id: string; fromMe?: boolean; participant?: string };
  content: string | null;
  messageId: string;
  remoteJid: string;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}): Promise<{ processedContent: string | null; finalMessageType: string }> {
  const { message, messageType, mediaMimetype, config, instance, messageKey, content, messageId, remoteJid, supabase } = params;

  const hasMedia = isMediaMessage(message);
  let processedContent = extractTextContent(message);
  let finalMessageType = messageType;

  if (!hasMedia || !config.is_active) {
    return { processedContent, finalMessageType };
  }

  const isTrigger = processedContent ? detectTrigger(processedContent, config.trigger_keywords) : false;
  const isAudio = messageType.toLowerCase().includes("audio") || messageType.toLowerCase().includes("ptt");
  const isMediaTrigger = isTrigger || isAudio;

  if (!isMediaTrigger) return { processedContent, finalMessageType };

  const mediaType = resolveMediaType(messageType);
  if (!mediaType) return { processedContent, finalMessageType };

  // Para documentos, só processar se for PDF
  if (mediaType === "pdf" && mediaMimetype && !isPdfDocument(mediaMimetype)) {
    return { processedContent, finalMessageType };
  }

  console.log(LOG_PREFIX, "Processando mídia", { mediaType, mimetype: mediaMimetype, messageType });

  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", config.company_id)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    let credentials;
    if (integration?.config) {
      const decoded = decodeIntegrationConfig("evolution_api", integration.config);
      credentials = resolveEvolutionCredentials({ baseUrl: decoded.baseUrl, apiKey: decoded.apiKey });
    } else {
      credentials = resolveEvolutionCredentials();
    }

    const instanceName = instance ?? process.env.EVOLUTION_INSTANCE_NAME?.trim() ?? "axiomix-default";

    const mediaDownload = await downloadEvolutionMedia({
      credentials,
      instanceName,
      messageKey: { remoteJid: messageKey.remoteJid, id: messageKey.id, fromMe: messageKey.fromMe, participant: messageKey.participant },
    });

    const mediaResult = await processMediaMessage(config.company_id, mediaType, mediaDownload.base64, mediaDownload.mimetype);

    const prefix = mediaType === "pdf" ? "[PDF]" : mediaType === "audio" ? "[ÁUDIO]" : "[IMAGEM]";
    processedContent = `${prefix} ${mediaResult.extractedText}`;
    finalMessageType = `${messageType}_processed`;

    console.log(LOG_PREFIX, "Mídia processada com sucesso", { mediaType, extractedLength: mediaResult.extractedText.length });
  } catch (err) {
    console.error(LOG_PREFIX, "Falha ao processar mídia:", {
      error: err instanceof Error ? err.message : err,
      mediaType, messageId, remoteJid, configId: config.id,
    });
    processedContent = content ?? `[${mediaType.toUpperCase()}] (falha no processamento)`;
  }

  return { processedContent, finalMessageType };
}

/* ------------------------------------------------------------------ */
/*  Agent response                                                     */
/* ------------------------------------------------------------------ */

export async function triggerAgentResponse(params: {
  config: GroupConfig;
  messageId: string;
  processedContent: string | null;
  senderJid: string;
  remoteJid: string;
  finalIsTrigger: boolean;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}): Promise<void> {
  const { config, messageId, processedContent, senderJid, remoteJid, finalIsTrigger, supabase } = params;

  // Check active session for multi-turn
  let isSessionContinuation = false;
  if (!finalIsTrigger && processedContent && config.is_active) {
    const { data: activeSession } = await supabase
      .from("group_agent_sessions")
      .select("id")
      .eq("config_id", config.id)
      .eq("sender_jid", senderJid)
      .eq("group_jid", remoteJid)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      isSessionContinuation = true;
      console.log(LOG_PREFIX, "Sessão ativa encontrada, continuando multi-turno sem trigger", {
        sessionId: activeSession.id, senderJid, groupJid: remoteJid,
      });
    } else {
      // Janela pos-proativo: nos X min seguintes a um resumo/alerta proativo,
      // qualquer resposta do grupo e tratada como continuacao sem exigir trigger.
      const PROACTIVE_WINDOW_MINUTES = 60;
      const windowStart = new Date(
        Date.now() - PROACTIVE_WINDOW_MINUTES * 60_000
      ).toISOString();

      const { data: recentProactive } = await supabase
        .from("group_agent_responses")
        .select("id, created_at")
        .eq("config_id", config.id)
        .in("response_type", ["proactive_summary", "proactive_alert"])
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentProactive) {
        isSessionContinuation = true;
        console.log(LOG_PREFIX, "Janela pos-proativo: processando sem trigger", {
          configId: config.id, senderJid, proactiveId: recentProactive.id,
          proactiveAt: recentProactive.created_at,
        });
      }
    }
  }

  if (!(finalIsTrigger || isSessionContinuation) || !processedContent) return;

  const { data: insertedMsg } = await supabase
    .from("group_messages")
    .select("id")
    .eq("company_id", config.company_id)
    .eq("message_id", messageId)
    .maybeSingle();

  if (!insertedMsg) return;

  console.log(LOG_PREFIX, isSessionContinuation
    ? "Processando multi-turno (sessão ativa)"
    : "Processando trigger inline (resposta imediata)", {
    msgDbId: insertedMsg.id, configId: config.id,
  });

  try {
    const result = await processGroupAgentResponse(config.company_id, {
      messageId: insertedMsg.id,
      configId: config.id,
    });
    console.log(LOG_PREFIX, "Resposta do agente gerada", {
      success: result.success, responseType: result.responseType, elapsed: `${result.processingTimeMs}ms`,
    });
  } catch (err) {
    console.error(LOG_PREFIX, "Falha ao processar resposta do agente:", err instanceof Error ? err.message : err);
  }
}
