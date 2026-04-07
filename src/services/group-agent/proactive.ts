/**
 * Arquivo: src/services/group-agent/proactive.ts
 * Proposito: Gerar mensagens proativas (resumo diario, alertas de vendas) para grupos.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { sendGroupAgentResponse } from "@/services/group-agent/sender";
import { resolvePreferredEvolutionInstance } from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type { ProactiveAction, GroupAgentResponseType } from "@/types/modules/group-agent.types";

type ProactiveResult = {
  success: boolean;
  action: ProactiveAction;
  responseText: string;
  error?: string;
};

async function resolveInstanceName(
  companyId: string,
  configInstanceName: string | null
): Promise<string> {
  if (configInstanceName) return configInstanceName;

  const supabase = createSupabaseAdminClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evolution_api")
    .eq("is_active", true)
    .maybeSingle();

  if (integration?.config) {
    const decoded = decodeIntegrationConfig("evolution_api", integration.config);
    const preferred = resolvePreferredEvolutionInstance(decoded.vendors);
    if (preferred) return preferred;
  }

  return process.env.EVOLUTION_INSTANCE_NAME ?? "axiomix-default";
}

export async function generateDailySummary(
  companyId: string,
  configId: string
): Promise<ProactiveResult> {
  const supabase = createSupabaseAdminClient();

  const { data: config } = await supabase
    .from("group_agent_configs")
    .select("*")
    .eq("id", configId)
    .maybeSingle();

  if (!config || !config.is_active) {
    return { success: false, action: "daily_summary", responseText: "", error: "Config inativa" };
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: messages } = await supabase
    .from("group_messages")
    .select("sender_name, content, sent_at")
    .eq("config_id", configId)
    .not("content", "is", null)
    .gte("sent_at", oneDayAgo)
    .order("sent_at", { ascending: true })
    .limit(100);

  if (!messages || messages.length < 3) {
    return {
      success: false,
      action: "daily_summary",
      responseText: "",
      error: "Poucas mensagens para resumir",
    };
  }

  const messagesText = messages
    .map((m) => {
      const time = new Date(m.sent_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${m.sender_name ?? "Desconhecido"} (${time}): ${m.content}`;
    })
    .join("\n");

  const systemPrompt = `Voce e ${config.agent_name}, assistente de IA do grupo WhatsApp "${config.group_name ?? "Grupo"}".
Gere um resumo diario conciso das conversas das ultimas 24 horas.

## Regras
1. Responda em portugues brasileiro, maximo 400 palavras.
2. Use formatacao WhatsApp: *negrito*, _italico_.
3. Estruture com: principais topicos discutidos, decisoes tomadas, pendencias.
4. Comece com uma saudacao breve como "*Resumo do dia* - ${new Date().toLocaleDateString("pt-BR")}".
5. Nao invente informacoes que nao estao nas mensagens.`;

  try {
    const responseText = await openRouterChatCompletion(companyId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Mensagens do grupo nas ultimas 24h:\n${messagesText}` },
    ], {
      responseFormat: "text",
      temperature: 0.3,
      maxTokens: 512,
      module: "group_agent",
      operation: "proactive_summary",
    });

    const instanceName = await resolveInstanceName(companyId, config.evolution_instance_name ?? null);

    await sendGroupAgentResponse({
      instanceName,
      groupJid: config.group_jid,
      responseText,
    });

    await supabase.from("group_agent_responses").insert({
      company_id: companyId,
      config_id: configId,
      trigger_message_id: null,
      group_jid: config.group_jid,
      response_text: responseText,
      response_type: "proactive_summary" as GroupAgentResponseType,
      rag_sources_used: 0,
      model_used: process.env.OPENROUTER_MODEL ?? "unknown",
      processing_time_ms: 0,
      evolution_status: "sent",
    });

    return { success: true, action: "daily_summary", responseText };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[proactive] Falha no resumo diario:", detail);
    return { success: false, action: "daily_summary", responseText: "", error: detail };
  }
}

export async function generateSalesAlert(
  companyId: string,
  configId: string
): Promise<ProactiveResult> {
  const supabase = createSupabaseAdminClient();

  const { data: config } = await supabase
    .from("group_agent_configs")
    .select("*")
    .eq("id", configId)
    .maybeSingle();

  if (!config || !config.is_active) {
    return { success: false, action: "sales_alert", responseText: "", error: "Config inativa" };
  }

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60_000);
  const twoDaysAgo = new Date(today.getTime() - 48 * 60 * 60_000);

  const [todayResult, yesterdayResult] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("sentiment, intent, sales_stage")
      .eq("company_id", companyId)
      .gte("generated_at", yesterday.toISOString())
      .lt("generated_at", today.toISOString()),
    supabase
      .from("conversation_insights")
      .select("sentiment, intent, sales_stage")
      .eq("company_id", companyId)
      .gte("generated_at", twoDaysAgo.toISOString())
      .lt("generated_at", yesterday.toISOString()),
  ]);

  const todayCount = todayResult.data?.length ?? 0;
  const yesterdayCount = yesterdayResult.data?.length ?? 0;

  if (yesterdayCount === 0) {
    return { success: false, action: "sales_alert", responseText: "", error: "Sem dados de comparacao" };
  }

  const variation = ((todayCount - yesterdayCount) / yesterdayCount) * 100;

  if (Math.abs(variation) < 20) {
    return { success: false, action: "sales_alert", responseText: "", error: "Sem variacao significativa" };
  }

  const todayPositive = todayResult.data?.filter((i) => i.sentiment === "positivo").length ?? 0;
  const yesterdayPositive = yesterdayResult.data?.filter((i) => i.sentiment === "positivo").length ?? 0;

  const direction = variation > 0 ? "aumento" : "queda";
  const emoji = variation > 0 ? "\u{1F4C8}" : "\u{1F4C9}";

  const alertText = `*Alerta de Vendas* ${emoji}

${direction.charAt(0).toUpperCase() + direction.slice(1)} de *${Math.abs(Math.round(variation))}%* nas conversas analisadas.

- Ontem: ${yesterdayCount} conversas (${yesterdayPositive} positivas)
- Hoje: ${todayCount} conversas (${todayPositive} positivas)

_Gerado automaticamente por ${config.agent_name}_`;

  try {
    const instanceName = await resolveInstanceName(companyId, config.evolution_instance_name ?? null);

    await sendGroupAgentResponse({
      instanceName,
      groupJid: config.group_jid,
      responseText: alertText,
    });

    await supabase.from("group_agent_responses").insert({
      company_id: companyId,
      config_id: configId,
      trigger_message_id: null,
      group_jid: config.group_jid,
      response_text: alertText,
      response_type: "proactive_alert" as GroupAgentResponseType,
      rag_sources_used: 0,
      model_used: "none",
      processing_time_ms: 0,
      evolution_status: "sent",
    });

    return { success: true, action: "sales_alert", responseText: alertText };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[proactive] Falha no alerta de vendas:", detail);
    return { success: false, action: "sales_alert", responseText: "", error: detail };
  }
}

export async function processProactiveJob(
  companyId: string,
  payload: { configId: string; action: ProactiveAction }
): Promise<ProactiveResult> {
  switch (payload.action) {
    case "daily_summary":
      return generateDailySummary(companyId, payload.configId);
    case "sales_alert":
      return generateSalesAlert(companyId, payload.configId);
    default:
      throw new Error(`Acao proativa desconhecida: ${payload.action}`);
  }
}
