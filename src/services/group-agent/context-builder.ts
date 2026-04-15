/**
 * Arquivo: src/services/group-agent/context-builder.ts
 * Propósito: Montar contexto completo para o agente IA responder no grupo.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";
import { getActiveNotes } from "@/services/group-agent/note-extractor";
import type { GroupAgentContext, GroupAgentIntent } from "@/types/modules/group-agent.types";

export async function buildAgentContext(
  companyId: string,
  configId: string,
  query: string,
  intent: GroupAgentIntent
): Promise<GroupAgentContext> {
  const supabase = createSupabaseAdminClient();

  const recentMessagesPromise = supabase
    .from("group_messages")
    .select("sender_name, content, sent_at")
    .eq("config_id", configId)
    .not("content", "is", null)
    .order("sent_at", { ascending: false })
    .limit(50);

  const previousResponsesPromise = supabase
    .from("group_agent_responses")
    .select("response_text, response_type, created_at")
    .eq("config_id", configId)
    .order("created_at", { ascending: false })
    .limit(3);

  const ragPromise =
    intent === "summary" || intent === "greeting"
      ? Promise.resolve("")
      : getKnowledgeBaseContext(companyId, query, {
          includeGlobal: true,
          matchCount: 5,
          matchThreshold: 0.4,
          maxChars: 3000,
        });

  // Incluir dados de vendas/CRM para intents que podem precisar
  const needsSalesData = intent === "sales_data" || intent === "report" ||
    intent === "general" || intent === "rag_query" || intent === "suggestion";
  const salesDataPromise = needsSalesData
    ? buildSalesDataContext(companyId)
    : Promise.resolve("");

  const notesPromise = getActiveNotes(configId, 20);

  const [recentResult, previousResult, knowledgeBaseContext, salesDataContext, agentNotes] =
    await Promise.all([
      recentMessagesPromise,
      previousResponsesPromise,
      ragPromise,
      salesDataPromise,
      notesPromise,
    ]);

  const recentMessages = (recentResult.data ?? [])
    .reverse()
    .map((m) => ({
      senderName: m.sender_name ?? "Desconhecido",
      content: m.content ?? "",
      sentAt: m.sent_at,
    }));

  const previousResponses = (previousResult.data ?? []).map((r) => ({
    responseText: r.response_text,
    responseType: r.response_type,
    createdAt: r.created_at,
  }));

  return {
    recentMessages,
    knowledgeBaseContext,
    salesDataContext,
    previousResponses,
    sessionHistory: [],
    agentNotes,
  };
}

async function buildSalesDataContext(companyId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const sections: string[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  // Buscar insights COM dados da conversa (join)
  const { data: insights } = await supabase
    .from("conversation_insights")
    .select(`
      sentiment, intent, sales_stage, summary,
      next_commitment, action_items, stall_reason,
      generated_at,
      conversations!inner(contact_name, contact_phone, status, last_message_at)
    `)
    .eq("company_id", companyId)
    .gte("generated_at", sevenDaysAgo)
    .order("generated_at", { ascending: false });

  if (insights && insights.length > 0) {
    const sentimentCounts = { positivo: 0, neutro: 0, negativo: 0 };
    const intentCounts: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};

    for (const i of insights) {
      if (i.sentiment && i.sentiment in sentimentCounts) {
        sentimentCounts[i.sentiment as keyof typeof sentimentCounts]++;
      }
      if (i.intent) {
        intentCounts[i.intent] = (intentCounts[i.intent] ?? 0) + 1;
      }
      if (i.sales_stage && i.sales_stage !== "unknown") {
        stageCounts[i.sales_stage] = (stageCounts[i.sales_stage] ?? 0) + 1;
      }
    }

    sections.push(
      `Conversas analisadas (ultimos 7 dias): ${insights.length}`
    );
    sections.push(
      `Sentimento: ${sentimentCounts.positivo} positivo, ${sentimentCounts.neutro} neutro, ${sentimentCounts.negativo} negativo`
    );

    if (Object.keys(intentCounts).length > 0) {
      const intents = Object.entries(intentCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      sections.push(`Intencoes: ${intents}`);
    }

    if (Object.keys(stageCounts).length > 0) {
      const stages = Object.entries(stageCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      sections.push(`Estagios de venda: ${stages}`);
    }

    // Enriquecer cada insight com telefone, dias desde último contato e flag de risco
    type EnrichedInsight = {
      name: string;
      phone: string | null;
      stage: string | null;
      sentiment: string | null;
      intent: string | null;
      summary: string | null;
      nextCommitment: string | null;
      stallReason: string | null;
      actionItems: string[];
      daysSinceLastContact: number | null;
      atRisk: boolean;
    };

    const now = Date.now();
    const enriched: EnrichedInsight[] = insights
      .filter((i) => i.summary && i.conversations)
      .map((i) => {
        const conv = i.conversations as unknown as {
          contact_name: string | null;
          contact_phone: string | null;
          status: string | null;
          last_message_at: string | null;
        };

        const daysSinceLastContact = conv.last_message_at
          ? Math.floor((now - new Date(conv.last_message_at).getTime()) / (24 * 60 * 60_000))
          : null;

        // Em risco: sentimento negativo E sem contato há 5+ dias
        const atRisk =
          i.sentiment === "negativo" &&
          daysSinceLastContact !== null &&
          daysSinceLastContact >= 5;

        const actions = i.action_items as string[] | null;
        const actionItems = Array.isArray(actions) ? actions : [];

        return {
          name: conv.contact_name ?? "Desconhecido",
          phone: conv.contact_phone,
          stage: i.sales_stage && i.sales_stage !== "unknown" ? i.sales_stage : null,
          sentiment: i.sentiment ?? null,
          intent: i.intent ?? null,
          summary: i.summary,
          nextCommitment: i.next_commitment,
          stallReason: i.stall_reason,
          actionItems,
          daysSinceLastContact,
          atRisk,
        };
      });

    const formatInsight = (e: EnrichedInsight, flag: string): string => {
      const nameLine = e.phone ? `${flag}*${e.name}* (${e.phone})` : `${flag}*${e.name}*`;
      const parts: string[] = [nameLine];

      const meta: string[] = [];
      if (e.stage) meta.push(`estágio: ${e.stage}`);
      if (e.sentiment) meta.push(`sentimento: ${e.sentiment}`);
      if (e.intent) meta.push(`intenção: ${e.intent}`);
      if (e.daysSinceLastContact !== null) {
        meta.push(
          e.daysSinceLastContact === 0
            ? "último contato: hoje"
            : `último contato: há ${e.daysSinceLastContact} dia(s)`
        );
      }
      if (meta.length > 0) parts.push(meta.join(" | "));

      if (e.summary) parts.push(`  Resumo: ${e.summary.slice(0, 200)}`);
      if (e.nextCommitment) parts.push(`  Próximo passo: ${e.nextCommitment}`);
      if (e.stallReason) parts.push(`  Motivo de estagnação: ${e.stallReason}`);
      if (e.actionItems.length > 0) {
        parts.push(`  Pendências: ${e.actionItems.slice(0, 3).join("; ")}`);
      }

      return parts.join("\n");
    };

    // Seção de leads em risco (topo, destacada)
    const atRiskLeads = enriched.filter((e) => e.atRisk).slice(0, 10);
    if (atRiskLeads.length > 0) {
      sections.push(`\n--- ⚠️ Leads em risco (sentimento negativo + sem contato há 5+ dias) ---`);
      sections.push(atRiskLeads.map((e) => formatInsight(e, "⚠️ EM RISCO: ")).join("\n\n"));
    }

    // Detalhes das demais conversas (max 15 no total, descontando as em risco)
    const remainingSlots = Math.max(0, 15 - atRiskLeads.length);
    const otherLeads = enriched.filter((e) => !e.atRisk).slice(0, remainingSlots);

    if (otherLeads.length > 0) {
      sections.push(`\n--- Detalhes das conversas ---`);
      sections.push(otherLeads.map((e) => formatInsight(e, "")).join("\n\n"));
    }
  }

  const { data: digest } = await supabase
    .from("conversation_digests")
    .select("summary_text, conversations_analyzed, purchase_intents, negative_sentiments")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (digest) {
    sections.push(`\nUltimo digest: ${digest.summary_text}`);
    sections.push(
      `Analisadas: ${digest.conversations_analyzed}, Intencoes de compra: ${digest.purchase_intents}, Sentimentos negativos: ${digest.negative_sentiments}`
    );
  }

  return sections.join("\n");
}
