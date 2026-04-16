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
import { buildCrmDailySnapshot } from "@/services/group-agent/context-builder";
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

  const crm = await buildCrmDailySnapshot(companyId);
  console.log("[proactive] daily_summary crm", { configId, ...crm.stats });

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

  // Piso absoluto: so abortamos se NEM o grupo NEM o CRM tiverem dados.
  // Se o CRM tiver dados, o resumo vale mesmo sem mensagens recentes do grupo.
  if (messageCount === 0 && !crm.hasData) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    const { count: weeklyCount } = await supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("config_id", configId)
      .gte("sent_at", sevenDaysAgo);

    if (!weeklyCount || weeklyCount === 0) {
      console.log("[proactive] daily_summary skip", { configId, reason: "grupo inativo 7d e sem CRM" });
      return {
        success: false,
        action: "daily_summary",
        responseText: "",
        error: "Grupo sem atividade ha 7 dias e sem dados de CRM",
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

  // Hora local America/Sao_Paulo (UTC-3) para decidir a saudacao.
  const spHourStr = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  const spHour = parseInt(spHourStr, 10);
  const periodo =
    spHour >= 5 && spHour < 12
      ? { label: "manha", saudacao: "Bom dia" }
      : spHour >= 12 && spHour < 18
      ? { label: "tarde", saudacao: "Boa tarde" }
      : { label: "noite", saudacao: "Boa noite" };

  const systemPrompt = `Voce e ${config.agent_name}, assistente de IA do grupo WhatsApp "${groupName}".
Tom de voz: ${agentTone}. Data de hoje: ${today}. Periodo atual: ${periodo.label} (horario de Sao Paulo: ${spHour}h).

IMPORTANTE: ao saudar o grupo use EXATAMENTE "${periodo.saudacao}" — nao use "Bom dia" a tarde/noite, nem "Boa noite" pela manha.

Seu objetivo NAO e apenas informar — e engajar o grupo com os DADOS REAIS
de vendas/conversas com leads do Sofia CRM e estimular conversa. Gere uma
mensagem com TRES partes, sempre nesta ordem:

## PARTE 1 — *Panorama comercial de hoje*
- Reproduza e comente o bloco "Panorama comercial" que voce recebera.
- NAO invente numeros. Se um campo nao estiver no panorama, omita.
- Destaque o que chama atencao (muitos leads quentes? sentimento caindo?
  negociacao parada ha dias? leads em risco?).
- Maximo 200 palavras nesta parte.
- Se NAO houver panorama (empresa sem CRM), pule PARTE 1 inteira.

## PARTE 2 — *Resumo do grupo* (opcional)
- SE houver mensagens do grupo das ultimas 24h no contexto, resuma em
  ~80 palavras (topicos, decisoes, pendencias).
- SE NAO houver, NAO escreva nada aqui — pule direto para PARTE 3. NAO
  escreva "dia mais quieto", "sem novidades", ou similares.

## PARTE 3 — *Bora conversar?*
- Gere 2 a 3 perguntas ABERTAS, curtas, instigantes.
- PRIORIZE perguntas conectadas aos DADOS do PANORAMA COMERCIAL, usando
  NOMES REAIS de leads quando possivel. Exemplos:
  * Lead em risco: "Alguem ja retomou com a ${"{nome}"}? O que deu pra fazer?"
  * Negocio parado: "Quem topa revisar juntos a abordagem do ${"{nome}"}?"
  * Muitos leads quentes: "Com ${"{n}"} leads em proposal hoje, qual voces acham
    que a gente deveria priorizar?"
  * Sentimento negativo: "O que voces acham que mudou pra ter ${"{n}"} conversas
    negativas hoje?"
- Se NAO tiver panorama, faca perguntas sobre o tema do grupo.
- Direcione ao grupo ("voces", "alguem", "quem ai…").
- Evite sim/nao. Feche com convite claro para responderem no grupo.

## Regras gerais
- Portugues brasileiro, formatacao WhatsApp (*negrito*, _italico_).
- Maximo 2-3 emojis na mensagem inteira.
- NAO se apresente como "IA" ou "bot" — voce e ${config.agent_name}, parte do grupo.
- NAO invente fatos, nomes ou numeros fora do panorama e das mensagens.`;

  const userContentParts: string[] = [];
  if (crm.hasData) {
    userContentParts.push(`Panorama comercial (dados reais do Sofia CRM, ultimas 24h):\n${crm.snapshot}`);
  } else {
    userContentParts.push(`Panorama comercial: (nenhum dado de CRM disponivel)`);
  }

  if (messageCount > 0) {
    userContentParts.push(`Mensagens do grupo nas ultimas 24h${lowActivity ? ` (baixa atividade — ${messageCount} mensagens)` : ""}:\n${messagesText}`);
  } else {
    userContentParts.push(`Mensagens do grupo nas ultimas 24h: (sem mensagens)`);
  }

  const userContent = userContentParts.join("\n\n");

  // Lock atomico: so um processo consegue reivindicar o envio de hoje.
  // Feito aqui (e nao no inicio) para nao queimar o dia em aborts precoces.
  const dayStartIso = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const { data: claimed } = await supabase
    .from("group_agent_configs")
    .update({ last_summary_sent_at: new Date().toISOString() })
    .eq("id", configId)
    .or(`last_summary_sent_at.is.null,last_summary_sent_at.lt.${dayStartIso}`)
    .select("id");

  if (!claimed || claimed.length === 0) {
    console.log("[proactive] daily_summary skip", { configId, reason: "ja enviado hoje (lock)" });
    return { success: false, action: "daily_summary", responseText: "", error: "Ja enviado hoje" };
  }

  try {
    const responseText = await openRouterChatCompletion(companyId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ], {
      responseFormat: "text",
      temperature: 0.6,
      maxTokens: 1000,
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
      // Rollback do lock para permitir reprocessar
      await supabase
        .from("group_agent_configs")
        .update({ last_summary_sent_at: null })
        .eq("id", configId);
      throw new Error(`Evolution falhou: ${sendResult.evolutionStatus}`);
    }

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
    // Garante rollback do lock em qualquer erro (OpenRouter, Evolution, DB)
    await supabase
      .from("group_agent_configs")
      .update({ last_summary_sent_at: null })
      .eq("id", configId);
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

  // Lock atomico no ultimo momento antes de enviar.
  const dayStartIsoAlert = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const { data: claimedAlert } = await supabase
    .from("group_agent_configs")
    .update({ last_sales_alert_sent_at: new Date().toISOString() })
    .eq("id", configId)
    .or(`last_sales_alert_sent_at.is.null,last_sales_alert_sent_at.lt.${dayStartIsoAlert}`)
    .select("id");

  if (!claimedAlert || claimedAlert.length === 0) {
    console.log("[proactive] sales_alert skip", { configId, reason: "ja enviado hoje (lock)" });
    return { success: false, action: "sales_alert", responseText: "", error: "Ja enviado hoje" };
  }

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
      // Rollback do lock para permitir reprocessar
      await supabase
        .from("group_agent_configs")
        .update({ last_sales_alert_sent_at: null })
        .eq("id", configId);
      throw new Error(`Evolution falhou: ${sendResult.evolutionStatus}`);
    }

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
    await supabase
      .from("group_agent_configs")
      .update({ last_sales_alert_sent_at: null })
      .eq("id", configId);
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
