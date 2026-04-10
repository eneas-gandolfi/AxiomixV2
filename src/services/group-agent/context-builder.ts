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
    intent === "summary"
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

    // Detalhes individuais das conversas mais relevantes (max 15)
    const detailedConversations = insights
      .filter((i) => i.summary && i.conversations)
      .slice(0, 15)
      .map((i) => {
        const conv = i.conversations as unknown as {
          contact_name: string | null;
          contact_phone: string | null;
          status: string | null;
          last_message_at: string | null;
        };
        const name = conv.contact_name ?? "Desconhecido";
        const stage = i.sales_stage && i.sales_stage !== "unknown" ? i.sales_stage : null;
        const sentiment = i.sentiment ?? null;
        const intent = i.intent ?? null;

        const parts: string[] = [`*${name}*`];
        if (stage) parts.push(`estagio: ${stage}`);
        if (sentiment) parts.push(`sentimento: ${sentiment}`);
        if (intent) parts.push(`intencao: ${intent}`);

        let line = parts.join(" | ");
        if (i.summary) line += `\n  Resumo: ${i.summary.slice(0, 200)}`;
        if (i.next_commitment) line += `\n  Proximo passo: ${i.next_commitment}`;
        if (i.stall_reason) line += `\n  Motivo de estagnacao: ${i.stall_reason}`;

        const actions = i.action_items as string[] | null;
        if (actions && Array.isArray(actions) && actions.length > 0) {
          line += `\n  Pendencias: ${actions.slice(0, 3).join("; ")}`;
        }

        return line;
      });

    if (detailedConversations.length > 0) {
      sections.push(`\n--- Detalhes das conversas ---`);
      sections.push(detailedConversations.join("\n\n"));
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
