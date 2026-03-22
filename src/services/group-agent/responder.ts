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
import { resolvePreferredEvolutionInstance } from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type {
  GroupAgentResponseResult,
  GroupAgentResponseType,
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

  const context = await buildAgentContext(
    companyId,
    config.id,
    cleanedQuery,
    intent
  );

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
    });
    modelUsed = process.env.OPENROUTER_MODEL ?? "unknown";
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro IA";
    console.error("[group-agent/responder] Falha na geração:", detail);

    await recordResponse(supabase, {
      companyId,
      configId: config.id,
      triggerMessageId: message.id,
      groupJid: message.group_jid,
      responseText: detail,
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: "llm_failed",
    });

    return {
      success: false,
      responseText: detail,
      responseType: "error",
      ragSourcesUsed: 0,
      modelUsed: "",
      processingTimeMs: Date.now() - startTime,
      evolutionStatus: "llm_failed",
    };
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
  const supabase = createSupabaseAdminClient();
  const cooldownAgo = new Date(Date.now() - cooldownSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("group_agent_responses")
    .select("id", { count: "exact", head: true })
    .eq("config_id", configId)
    .gte("created_at", cooldownAgo);

  return (count ?? 0) === 0;
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
