/**
 * Arquivo: src/services/group-agent/responder.ts
 * Propósito: Orquestrador principal — processa trigger e gera resposta do agente no grupo.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import "server-only";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import {
  buildGroupAgentSystemPrompt,
  buildGroupAgentUserPrompt,
} from "@/lib/ai/prompts/group-agent";
import { detectGroupAgentIntent } from "@/services/group-agent/intent-detector";
import { buildAgentContext } from "@/services/group-agent/context-builder";
import { sendGroupAgentResponse } from "@/services/group-agent/sender";
import {
  getActiveSession,
  upsertSession,
  appendAgentResponse as appendToSession,
  resetSession,
  isResetCommand,
} from "@/services/group-agent/session-manager";
import { extractAndSaveNotes } from "@/services/group-agent/note-extractor";
import { resolvePreferredEvolutionInstance } from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type {
  GroupAgentResponseResult,
  GroupAgentResponseType,
  SessionMessage,
} from "@/types/modules/group-agent.types";

export const groupAgentRespondPayloadSchema = z.object({
  messageId: z.string().uuid("messageId inválido."),
  configId: z.string().uuid("configId inválido."),
});

const INTENT_TO_RESPONSE_TYPE: Record<string, GroupAgentResponseType> = {
  summary: "summary",
  sales_data: "sales_data",
  report: "report",
  rag_query: "rag_query",
  suggestion: "reply",
  general: "reply",
};

export async function processGroupAgentResponse(
  companyId: string,
  payload: { messageId: string; configId: string }
): Promise<GroupAgentResponseResult> {
  const startTime = Date.now();
  const supabase = createSupabaseAdminClient();

  const [{ data: message }, { data: config }] = await Promise.all([
    supabase
      .from("group_messages")
      .select("*")
      .eq("id", payload.messageId)
      .maybeSingle(),
    supabase
      .from("group_agent_configs")
      .select("*")
      .eq("id", payload.configId)
      .maybeSingle(),
  ]);

  if (!message || !config) {
    throw new Error("Mensagem ou configuração do agente não encontrada.");
  }

  if (!config.is_active) {
    return {
      success: false,
      responseText: "",
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: "skipped_inactive",
    };
  }

  const rateLimitOk = await checkRateLimit(config.id, config.max_responses_per_hour);
  if (!rateLimitOk) {
    return {
      success: false,
      responseText: "",
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: "rate_limited",
    };
  }

  const cooldownOk = await checkCooldown(config.id, config.cooldown_seconds);
  if (!cooldownOk) {
    return {
      success: false,
      responseText: "",
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: "cooldown",
    };
  }

  const { intent, cleanedQuery } = detectGroupAgentIntent(
    message.content ?? "",
    config.trigger_keywords
  );

  // Comando explícito de reset de sessão
  if (isResetCommand(cleanedQuery)) {
    await resetSession(config.id, message.sender_jid, message.group_jid);

    // Resolver instance para enviar confirmação
    let resetInstance = config.evolution_instance_name ?? null;
    if (!resetInstance) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("config")
        .eq("company_id", companyId)
        .eq("type", "evolution_api")
        .eq("is_active", true)
        .maybeSingle();
      if (integration?.config) {
        const decoded = decodeIntegrationConfig("evolution_api", integration.config);
        resetInstance = resolvePreferredEvolutionInstance(decoded.vendors) ?? null;
      }
    }
    resetInstance = resetInstance ?? process.env.EVOLUTION_INSTANCE_NAME ?? "axiomix-default";

    const resetText = "Ok, comecei uma conversa nova. O que você precisa?";
    const resetResult = await sendGroupAgentResponse({
      instanceName: resetInstance,
      groupJid: message.group_jid,
      responseText: resetText,
    });

    await recordResponse(supabase, {
      companyId,
      configId: config.id,
      triggerMessageId: message.id,
      groupJid: message.group_jid,
      responseText: resetText,
      responseType: "reply",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: resetResult.evolutionStatus,
    });

    return {
      success: resetResult.success,
      responseText: resetText,
      responseType: "reply",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: resetResult.evolutionStatus,
    };
  }

  const context = await buildAgentContext(
    companyId,
    config.id,
    cleanedQuery,
    intent
  );

  // Multi-turno: buscar sessao ativa e registrar mensagem do usuario
  let sessionId: string | null = null;
  try {
    const existingSession = await getActiveSession(
      config.id,
      message.sender_jid,
      message.group_jid
    );

    const userSessionMessage: SessionMessage = {
      role: "user",
      content: cleanedQuery,
      timestamp: new Date().toISOString(),
    };

    sessionId = await upsertSession(
      companyId,
      config.id,
      message.sender_jid,
      message.group_jid,
      userSessionMessage
    );

    if (existingSession?.messages) {
      context.sessionHistory = existingSession.messages as SessionMessage[];
    }
  } catch (sessionErr) {
    console.error("[group-agent/responder] Sessao falhou (continuando sem multi-turno):", sessionErr instanceof Error ? sessionErr.message : sessionErr);
  }

  const systemPrompt = buildGroupAgentSystemPrompt({
    agentName: config.agent_name,
    agentTone: config.agent_tone,
    groupName: config.group_name ?? "Grupo",
    triggerMessage: cleanedQuery,
    senderName: message.sender_name ?? "Usuário",
    intent,
    recentMessages: context.recentMessages,
    knowledgeBaseContext: context.knowledgeBaseContext,
    salesDataContext: context.salesDataContext,
    sessionHistory: context.sessionHistory,
    agentNotes: context.agentNotes,
  });

  const userPrompt = buildGroupAgentUserPrompt(
    message.sender_name ?? "Usuário",
    cleanedQuery
  );

  let responseText: string;
  let modelUsed = "";
  try {
    responseText = await openRouterChatCompletion(companyId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      responseFormat: "text",
      temperature: 0.3,
      maxTokens: 1024,
      module: "group_agent",
      operation: "respond",
    });
    modelUsed = process.env.OPENROUTER_MODEL ?? "unknown";
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro IA";
    console.error("[group-agent/responder] Falha na geração:", detail);

    // Resolver instance para enviar fallback amigável ao grupo
    let fallbackInstance = config.evolution_instance_name ?? null;
    if (!fallbackInstance) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("config")
        .eq("company_id", companyId)
        .eq("type", "evolution_api")
        .eq("is_active", true)
        .maybeSingle();
      if (integration?.config) {
        const decoded = decodeIntegrationConfig("evolution_api", integration.config);
        fallbackInstance = resolvePreferredEvolutionInstance(decoded.vendors) ?? null;
      }
    }
    fallbackInstance = fallbackInstance ?? process.env.EVOLUTION_INSTANCE_NAME ?? "axiomix-default";

    const fallbackText = "Tive uma dificuldade técnica agora. Pode tentar de novo em alguns segundos?";

    let fallbackStatus = "llm_failed";
    try {
      const sendResult = await sendGroupAgentResponse({
        instanceName: fallbackInstance,
        groupJid: message.group_jid,
        responseText: fallbackText,
      });
      fallbackStatus = sendResult.success ? "llm_failed_fallback_sent" : "llm_failed_fallback_send_failed";
    } catch (sendErr) {
      console.error("[group-agent/responder] Falha ao enviar fallback:", sendErr instanceof Error ? sendErr.message : sendErr);
    }

    await recordResponse(supabase, {
      companyId,
      configId: config.id,
      triggerMessageId: message.id,
      groupJid: message.group_jid,
      responseText: fallbackText,
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: fallbackStatus,
    });

    return {
      success: false,
      responseText: fallbackText,
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: fallbackStatus,
    };
  }

  // Multi-turno: salvar resposta do agente na sessao
  if (sessionId) {
    appendToSession(sessionId, responseText).catch((err) =>
      console.error("[group-agent/responder] Falha ao salvar resposta na sessao:", err instanceof Error ? err.message : err)
    );
  }

  // Resolver instance name: config > integração DB (vendor preferido) > env var
  let instanceName = config.evolution_instance_name ?? null;

  if (!instanceName) {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", companyId)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    if (integration?.config) {
      const decoded = decodeIntegrationConfig("evolution_api", integration.config);
      instanceName = resolvePreferredEvolutionInstance(decoded.vendors) ?? null;
    }
  }

  instanceName = instanceName ?? process.env.EVOLUTION_INSTANCE_NAME ?? "axiomix-default";

  const sendResult = await sendGroupAgentResponse({
    instanceName,
    groupJid: message.group_jid,
    responseText,
  });

  const responseType = INTENT_TO_RESPONSE_TYPE[intent] ?? "reply";
  const ragSourcesUsed = context.knowledgeBaseContext ? 1 : 0;
  const processingTimeMs = Date.now() - startTime;

  await recordResponse(supabase, {
    companyId,
    configId: config.id,
    triggerMessageId: message.id,
    groupJid: message.group_jid,
    responseText,
    responseType,
    ragSourcesUsed,
    modelUsed,
    processingTimeMs,
    evolutionStatus: sendResult.evolutionStatus,
  });

  await supabase
    .from("group_messages")
    .update({ agent_responded: true })
    .eq("id", message.id);

  // Extrair notas em background (best-effort, não bloqueia resposta)
  extractAndSaveNotes({
    companyId,
    configId: config.id,
    groupJid: message.group_jid,
    userMessage: cleanedQuery,
    senderName: message.sender_name ?? "Usuário",
    agentResponse: responseText,
    recentMessages: context.recentMessages,
  }).catch((err) =>
    console.error("[group-agent/responder] Falha na extração de notas:", err instanceof Error ? err.message : err)
  );

  return {
    success: sendResult.success,
    responseText,
    responseType,
    ragSourcesUsed,
    modelUsed,
    processingTimeMs,
    evolutionStatus: sendResult.evolutionStatus,
  };
}

async function checkRateLimit(
  configId: string,
  maxPerHour: number
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

  const { count } = await supabase
    .from("group_agent_responses")
    .select("id", { count: "exact", head: true })
    .eq("config_id", configId)
    .gte("created_at", oneHourAgo);

  return (count ?? 0) < maxPerHour;
}

async function checkCooldown(
  configId: string,
  cooldownSeconds: number
): Promise<boolean> {
  if (cooldownSeconds <= 0) return true;

  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("group_agent_responses")
    .select("created_at")
    .eq("config_id", configId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true;

  const elapsedMs = Date.now() - new Date(data.created_at).getTime();
  return elapsedMs >= cooldownSeconds * 1000;
}

type RecordInput = {
  companyId: string;
  configId: string;
  triggerMessageId: string;
  groupJid: string;
  responseText: string;
  responseType: GroupAgentResponseType;
  ragSourcesUsed: number;
  modelUsed: string;
  processingTimeMs: number;
  evolutionStatus: string;
};

async function recordResponse(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: RecordInput
): Promise<void> {
  await supabase.from("group_agent_responses").insert({
    company_id: input.companyId,
    config_id: input.configId,
    trigger_message_id: input.triggerMessageId,
    group_jid: input.groupJid,
    response_text: input.responseText,
    response_type: input.responseType,
    rag_sources_used: input.ragSourcesUsed,
    model_used: input.modelUsed,
    processing_time_ms: input.processingTimeMs,
    evolution_status: input.evolutionStatus,
  });
}
