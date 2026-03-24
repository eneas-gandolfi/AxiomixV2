/**
 * Arquivo: src/services/whatsapp/batch-analyzer.ts
 * Propósito: Análise batch horária de conversas WhatsApp — classificação leve + resumo geral.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import "server-only";

import { z } from "zod";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import {
  buildBatchAnalysisPrompt,
  type BatchConversation,
} from "@/lib/ai/prompts/whatsapp-batch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assessConversationGuardrails } from "@/lib/whatsapp/conversation-guardrails";
import {
  conversationIntentValues,
  normalizeConversationIntent,
} from "@/lib/whatsapp/intent";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";
import {
  triggerPurchaseIntentAlert,
  triggerNegativeSentimentAlert,
} from "@/services/alerts/alert-triggers";

const MAX_CONVERSATIONS_PER_BATCH = 20;
const MESSAGES_PER_CONVERSATION = 5;

const batchAnalysisItemSchema = z.object({
  conversationId: z.string(),
  sentiment: z.enum(["positivo", "neutro", "negativo"]),
  intent: z.preprocess(
    (value) =>
      typeof value === "string" ? normalizeConversationIntent(value) ?? value : value,
    z.enum(conversationIntentValues)
  ),
  urgency: z.number().int().min(1).max(5).optional().default(3),
  key_topics: z.array(z.string().trim().min(1)).max(5).optional().default([]),
  summary: z.string().trim().max(400).optional().default(""),
});

const batchAnalysisResponseSchema = z.object({
  analyses: z.array(batchAnalysisItemSchema),
  summary: z.string().trim().min(1),
});

type BatchAnalysisResult = {
  companyId: string;
  conversationsAnalyzed: number;
  purchaseIntents: number;
  negativeSentiments: number;
  summaryText: string;
  periodStart: string;
  periodEnd: string;
};

type EligibleConversation = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  remote_jid: string;
  external_id: string | null;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fallbackClassification(messages: Array<{ content: string | null }>) {
  const assessment = assessConversationGuardrails(messages);

  if (assessment.isClearlyPersonal) {
    return {
      sentiment: assessment.suggestedSentiment,
      intent: "outro" as const,
      urgency: 1,
      key_topics: ["conversa pessoal"],
    };
  }

  const combined = normalizeText(
    messages.map((m) => m.content ?? "").join(" ").slice(0, 3000)
  );

  const negativeWords = ["reclam", "cancel", "ruim", "atras", "problema", "insatisfeit"];
  const purchaseWords = ["preco", "compr", "orcamento", "proposta", "pagamento"];
  const supportWords = ["suporte", "ajuda", "erro", "nao funciona"];
  const hasNegative = negativeWords.some((w) => combined.includes(w));
  const hasPurchase = purchaseWords.some((w) => combined.includes(w));
  const hasSupport = supportWords.some((w) => combined.includes(w));

  // Conversa pessoal: padrões afetivos SEM keywords de negócio
  const sentiment: "positivo" | "neutro" | "negativo" = hasNegative ? "negativo" : "neutro";
  let intent: "compra" | "suporte" | "reclamacao" | "duvida" | "cancelamento" | "outro" = "outro";
  if (hasPurchase) intent = "compra";
  else if (hasSupport) intent = "suporte";
  else if (hasNegative) intent = "reclamacao";

  return {
    sentiment,
    intent,
    urgency: hasNegative ? 4 : 3,
    key_topics: [] as string[],
  };
}

function applyClassificationGuardrails(
  messages: Array<{ content: string | null }>,
  classification: z.infer<typeof batchAnalysisItemSchema>
) {
  const assessment = assessConversationGuardrails(messages);

  if (!assessment.isClearlyPersonal) {
    return classification;
  }

  return {
    ...classification,
    sentiment: assessment.suggestedSentiment,
    intent: "outro" as const,
    urgency: 1,
    key_topics: ["conversa pessoal"],
  };
}

async function getEligibleConversations(companyId: string): Promise<EligibleConversation[]> {
  const supabase = createSupabaseAdminClient();

  // Buscar conversas recentes com suas últimas análises
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, contact_name, contact_phone, remote_jid, external_id, last_message_at")
    .eq("company_id", companyId)
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (error || !conversations) {
    return [];
  }

  const conversationIds = conversations.map((c) => c.id);
  if (conversationIds.length === 0) return [];

  // Buscar insights existentes para estas conversas
  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("conversation_id, generated_at")
    .eq("company_id", companyId)
    .in("conversation_id", conversationIds);

  const insightMap = new Map(
    (insights ?? []).map((i) => [i.conversation_id, i.generated_at])
  );

  // Filtrar: conversas sem insight OU com novas mensagens desde o último insight
  const eligible = conversations.filter((conv) => {
    const lastInsight = insightMap.get(conv.id);
    if (!lastInsight) return true; // Sem insight — elegível
    if (!conv.last_message_at) return false;
    // Novas mensagens desde o último insight
    return new Date(conv.last_message_at) > new Date(lastInsight);
  });

  return eligible.slice(0, MAX_CONVERSATIONS_PER_BATCH).map((c) => ({
    id: c.id,
    contact_name: c.contact_name,
    contact_phone: c.contact_phone,
    remote_jid: c.remote_jid,
    external_id: c.external_id,
  }));
}

async function loadRecentMessages(
  companyId: string,
  conversationIds: string[]
): Promise<Map<string, Array<{ direction: "inbound" | "outbound"; content: string | null; sent_at: string | null; message_type?: string | null }>>> {
  const supabase = createSupabaseAdminClient();

  // Carregar mensagens recentes para todas as conversas de uma vez
  // Ordenamos por sent_at DESC para pegar as mais recentes, depois invertemos no JS
  // Limitar a N mensagens por conversa × total de conversas para evitar carga excessiva
  const maxMessages = MESSAGES_PER_CONVERSATION * conversationIds.length;
  const { data: allMessages, error } = await supabase
    .from("messages")
    .select("conversation_id, direction, content, sent_at, message_type")
    .eq("company_id", companyId)
    .in("conversation_id", conversationIds)
    .order("sent_at", { ascending: false })
    .limit(maxMessages);

  if (error || !allMessages) {
    return new Map();
  }

  // Agrupar por conversa e limitar a N mensagens mais recentes
  const grouped = new Map<string, Array<{ direction: "inbound" | "outbound"; content: string | null; sent_at: string | null; message_type?: string | null }>>();

  for (const msg of allMessages) {
    if (!msg.conversation_id || !msg.direction) continue;
    const existing = grouped.get(msg.conversation_id) ?? [];
    if (existing.length < MESSAGES_PER_CONVERSATION) {
      existing.push({
        direction: msg.direction,
        content: msg.content,
        sent_at: msg.sent_at,
        message_type: msg.message_type,
      });
      grouped.set(msg.conversation_id, existing);
    }
  }

  // Inverter para ordem cronológica (estão em DESC do banco)
  for (const [key, msgs] of grouped) {
    grouped.set(key, msgs.reverse());
  }

  return grouped;
}

export async function runBatchAnalysis(companyId: string): Promise<BatchAnalysisResult> {
  const periodEnd = new Date().toISOString();
  const periodStart = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h atrás

  const eligible = await getEligibleConversations(companyId);

  if (eligible.length === 0) {
    return {
      companyId,
      conversationsAnalyzed: 0,
      purchaseIntents: 0,
      negativeSentiments: 0,
      summaryText: "Nenhuma conversa nova para analisar neste período.",
      periodStart,
      periodEnd,
    };
  }

  const conversationIds = eligible.map((c) => c.id);
  const messagesMap = await loadRecentMessages(companyId, conversationIds);

  // Filtrar conversas que realmente têm mensagens
  const conversationsWithMessages = eligible.filter((c) => {
    const msgs = messagesMap.get(c.id);
    return msgs && msgs.length > 0;
  });

  if (conversationsWithMessages.length === 0) {
    return {
      companyId,
      conversationsAnalyzed: 0,
      purchaseIntents: 0,
      negativeSentiments: 0,
      summaryText: "Conversas elegíveis sem mensagens para analisar.",
      periodStart,
      periodEnd,
    };
  }

  // KB context compartilhado (1 chamada para todas)
  const kbContext = await getKnowledgeBaseContext(
    companyId,
    "análise vendas atendimento whatsapp gargalos oportunidades diagnóstico",
    { includeGlobal: true }
  );

  // Montar conversas para o prompt
  const batchConversations: BatchConversation[] = conversationsWithMessages.map((conv) => ({
    conversationId: conv.id,
    contactName: conv.contact_name ?? conv.remote_jid,
    messages: (messagesMap.get(conv.id) ?? []).map((msg) => ({
      direction: msg.direction,
      content: msg.content ?? "",
      sentAt: msg.sent_at ?? new Date().toISOString(),
      messageType: msg.message_type,
    })),
  }));

  const prompt = buildBatchAnalysisPrompt({
    conversations: batchConversations,
    knowledgeBaseContext: kbContext || undefined,
  });

  // Classificar via IA ou fallback
  let analyses: z.infer<typeof batchAnalysisResponseSchema>;

  try {
    const rawJson = await openRouterChatCompletion(
      companyId,
      [
        {
          role: "system",
          content: "Você responde apenas JSON válido, sem markdown e sem texto extra.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { model: process.env.OPENROUTER_MODEL_LIGHT }
    );

    const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleanedJson = jsonMatch?.[1]?.trim() ?? rawJson.trim();
    const parsed: unknown = JSON.parse(cleanedJson);
    const parsedAnalyses = batchAnalysisResponseSchema.parse(parsed);
    analyses = {
      ...parsedAnalyses,
      analyses: parsedAnalyses.analyses.map((item) =>
        applyClassificationGuardrails(messagesMap.get(item.conversationId) ?? [], item)
      ),
    };
  } catch (error) {
    // Fallback: classificação heurística para cada conversa
    console.error("[batch-analyzer] Falha na chamada IA â€” usando fallback:", error);
    const fallbackAnalyses = conversationsWithMessages.map((conv) => {
      const msgs = messagesMap.get(conv.id) ?? [];
      const classification = fallbackClassification(msgs);
      return {
        conversationId: conv.id,
        ...classification,
        summary: "",
      };
    });

    analyses = {
      analyses: fallbackAnalyses,
      summary: `Análise batch em modo fallback. ${conversationsWithMessages.length} conversas classificadas por heurística.`,
    };
  }

  // Mapear conversas elegíveis por ID para acesso rápido
  const convMap = new Map(conversationsWithMessages.map((c) => [c.id, c]));

  // Upsert insights e disparar alertas
  const supabase = createSupabaseAdminClient();
  const generatedAt = new Date().toISOString();
  let purchaseIntents = 0;
  let negativeSentiments = 0;

  for (const item of analyses.analyses) {
    const conv = convMap.get(item.conversationId);
    if (!conv) continue;

    if (item.intent === "compra") purchaseIntents += 1;
    if (item.sentiment === "negativo") negativeSentiments += 1;

    // Upsert classificação leve em conversation_insights
    await supabase.from("conversation_insights").upsert(
      {
        company_id: companyId,
        conversation_id: item.conversationId,
        sentiment: item.sentiment,
        intent: item.intent,
        summary: item.summary || "Classificado via análise batch horária.",
        action_items: {
          items: [],
          urgency: item.urgency,
          suggested_response: "",
          key_topics: item.key_topics,
        },
        generated_at: generatedAt,
      },
      { onConflict: "conversation_id" }
    );

    // Alertas fire-and-forget
    if (item.intent === "compra") {
      triggerPurchaseIntentAlert({
        companyId,
        conversationId: item.conversationId,
        contactName: conv.contact_name,
        contactPhone: conv.contact_phone,
        summary: `Intenção de compra detectada (batch). Tópicos: ${item.key_topics.join(", ") || "N/A"}.`,
      });
    }

    if (item.sentiment === "negativo" && item.urgency >= 4) {
      triggerNegativeSentimentAlert({
        companyId,
        conversationId: item.conversationId,
        contactName: conv.contact_name,
        contactPhone: conv.contact_phone,
        urgency: item.urgency,
        summary: `Sentimento negativo detectado (batch). Tópicos: ${item.key_topics.join(", ") || "N/A"}.`,
      });
    }
  }

  // Salvar digest
  await supabase.from("conversation_digests").insert({
    company_id: companyId,
    period_start: periodStart,
    period_end: periodEnd,
    conversations_analyzed: analyses.analyses.length,
    purchase_intents: purchaseIntents,
    negative_sentiments: negativeSentiments,
    summary_text: analyses.summary,
  });

  return {
    companyId,
    conversationsAnalyzed: analyses.analyses.length,
    purchaseIntents,
    negativeSentiments,
    summaryText: analyses.summary,
    periodStart,
    periodEnd,
  };
}

export type { BatchAnalysisResult };
