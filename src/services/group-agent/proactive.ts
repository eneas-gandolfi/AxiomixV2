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
    console.log("[proactive] daily_summary skip", { configId, reason: "config inativa" });
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

  const messageCount = messages?.length ?? 0;
  const lowActivity = messageCount < 3;

  console.log("[proactive] daily_summary", {
    configId,
    messages: messageCount,
    lowActivity,
  });

  // Piso absoluto: se nem nos ultimos 7 dias houve mensagens, nao mandar nada.
  if (messageCount === 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    const { count: weeklyCount } = await supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("config_id", configId)
      .gte("sent_at", sevenDaysAgo);

    if (!weeklyCount || weeklyCount === 0) {
      console.log("[proactive] daily_summary skip", { configId, reason: "grupo inativo 7d" });
      return {
        success: false,
        action: "daily_summary",
        responseText: "",
        error: "Grupo sem atividade ha 7 dias",
      };
    }
  }

  const messagesText = (messages ?? [])
    .map((m) => {
      const time = new Date(m.sent_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${m.sender_name ?? "Desconhecido"} (${time}): ${m.content}`;
    })
    .join("\n");

  const today = new Date().toLocaleDateString("pt-BR");
  const agentTone = config.agent_tone ?? "Profissional";
  const groupName = config.group_name ?? "Grupo";

  const systemPrompt = `Voce e ${config.agent_name}, assistente de IA do grupo WhatsApp "${groupName}".
Tom de voz: ${agentTone}.

Seu objetivo NAO e apenas informar — e engajar o grupo e estimular conversa.
Gere uma mensagem com DUAS partes, sempre nesta ordem:

## PARTE 1 — *Resumo do dia* - ${today}
- Maximo 250 palavras, portugues brasileiro, formatacao WhatsApp (*negrito*, _italico_).
- Cubra: principais topicos discutidos, decisoes tomadas, pendencias em aberto.
- Nao invente nada que nao esteja nas mensagens.
- Se o historico for escasso (poucas mensagens), faca a PARTE 1 bem curta (1-2 linhas tipo "_Dia mais quieto por aqui._") e va direto para a PARTE 2.

## PARTE 2 — *Bora conversar?*
- Gere de 2 a 3 perguntas ABERTAS, curtas e instigantes, conectadas aos topicos do resumo (ou ao tema do grupo, se o dia foi quieto).
- Direcione ao grupo usando "voces", "alguem", "quem ai…", "algum de voces ja…".
- Evite perguntas de sim/nao. Prefira perguntas que puxem experiencia, opiniao ou historia.
- Feche com um convite claro para responderem ali mesmo no grupo (ex.: "_Manda ai nas mensagens, quero saber!_").

## Regras gerais
- Nunca se apresente como "IA" ou "bot" — voce e ${config.agent_name}, parte do grupo.
- Nao use emojis em excesso (maximo 2-3 na mensagem inteira).
- Nao invente fatos, nomes ou numeros que nao estejam nas mensagens fornecidas.`;

  const userContent = lowActivity
    ? `Mensagens do grupo nas ultimas 24h (baixa atividade — ${messageCount} mensagens):\n${messagesText || "(sem mensagens)"}\n\nO dia foi quieto: faca PARTE 1 bem curta e foque em PARTE 2 com perguntas de aquecimento sobre o tema do grupo "${groupName}".`
    : `Mensagens do grupo nas ultimas 24h:\n${messagesText}`;

  try {
    const responseText = await openRouterChatCompletion(companyId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ], {
      responseFormat: "text",
      temperature: 0.6,
      maxTokens: 700,
      module: "group_agent",
      operation: "proactive_summary",
    });

    const instanceName = await resolveInstanceName(companyId, config.evolution_instance_name ?? null);

    console.log("[proactive] daily_summary send", {
      configId,
      instanceName,
      groupJid: config.group_jid,
    });

    const sendResult = await sendGroupAgentResponse({
      instanceName,
      groupJid: config.group_jid,
      responseText,
    });

    if (!sendResult.success) {
      throw new Error(`Evolution falhou: ${sendResult.evolutionStatus}`);
    }

    await supabase
      .from("group_agent_configs")
      .update({ last_summary_sent_at: new Date().toISOString() })
      .eq("id", configId);

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
      evolution_status: sendResult.evolutionStatus,
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
    console.log("[proactive] sales_alert skip", { configId, reason: "config inativa" });
    return { success: false, action: "sales_alert", responseText: "", error: "Config inativa" };
  }

  const now = new Date();
  const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60_000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60_000);

  const [todayResult, yesterdayResult] = await Promise.all([
    supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("config_id", configId)
      .gte("sent_at", yesterdayStart.toISOString())
      .lt("sent_at", now.toISOString()),
    supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("config_id", configId)
      .gte("sent_at", twoDaysAgo.toISOString())
      .lt("sent_at", yesterdayStart.toISOString()),
  ]);

  const todayCount = todayResult.count ?? 0;
  const yesterdayCount = yesterdayResult.count ?? 0;

  console.log("[proactive] sales_alert", { configId, todayCount, yesterdayCount });

  if (todayCount === 0 && yesterdayCount === 0) {
    return {
      success: false,
      action: "sales_alert",
      responseText: "",
      error: "Sem mensagens nos ultimos 2 dias",
    };
  }

  // Se ontem nao teve nada mas hoje teve, considera aumento de 100% (evita divisao por zero).
  const variation =
    yesterdayCount === 0
      ? 100
      : ((todayCount - yesterdayCount) / yesterdayCount) * 100;

  if (Math.abs(variation) < 20) {
    console.log("[proactive] sales_alert skip", {
      configId,
      reason: "variacao < 20%",
      variation: Math.round(variation),
    });
    return { success: false, action: "sales_alert", responseText: "", error: "Sem variacao significativa" };
  }

  const direction = variation > 0 ? "aumento" : "queda";
  const emoji = variation > 0 ? "\u{1F4C8}" : "\u{1F4C9}";

  const alertText = `*Alerta de volume* ${emoji}

${direction.charAt(0).toUpperCase() + direction.slice(1)} de *${Math.abs(Math.round(variation))}%* no volume de conversas do grupo.

- Ontem: ${yesterdayCount} mensagens
- Hoje: ${todayCount} mensagens

${variation > 0 ? "_Bom momento para engajar e puxar conversa com a galera!_" : "_Que tal instigar o grupo com uma pergunta hoje?_"}

_Gerado automaticamente por ${config.agent_name}_`;

  try {
    const instanceName = await resolveInstanceName(companyId, config.evolution_instance_name ?? null);

    console.log("[proactive] sales_alert send", {
      configId,
      instanceName,
      groupJid: config.group_jid,
    });

    const sendResult = await sendGroupAgentResponse({
      instanceName,
      groupJid: config.group_jid,
      responseText: alertText,
    });

    if (!sendResult.success) {
      throw new Error(`Evolution falhou: ${sendResult.evolutionStatus}`);
    }

    await supabase
      .from("group_agent_configs")
      .update({ last_sales_alert_sent_at: new Date().toISOString() })
      .eq("id", configId);

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
      evolution_status: sendResult.evolutionStatus,
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
