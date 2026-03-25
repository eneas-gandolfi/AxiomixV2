/**
 * Arquivo: src/services/whatsapp/analyzer.ts
 * Proposito: Analisar conversas com IA e aplicar acoes automaticas no Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { buildWhatsAppAnalysisPrompt } from "@/lib/ai/prompts/whatsapp";
import { assessConversationGuardrails } from "@/lib/whatsapp/conversation-guardrails";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";
import {
  triggerNegativeSentimentAlert,
  triggerPurchaseIntentAlert,
} from "@/services/alerts/alert-triggers";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";
import { enrichMediaMessages } from "@/lib/whatsapp/media-enricher";

/** Normaliza variações comuns retornadas pela IA nos enums. */
function normalizeEnum(value: unknown, map: Record<string, string>): unknown {
  if (typeof value !== "string") return value;
  const lower = value.toLowerCase().trim();
  return map[lower] ?? lower;
}

const sentimentMap: Record<string, string> = {
  positive: "positivo",
  negative: "negativo",
  neutral: "neutro",
};

const intentMap: Record<string, string> = {
  "reclamação": "reclamacao",
  "dúvida": "duvida",
  "duvída": "duvida",
  purchase: "compra",
  support: "suporte",
  complaint: "reclamacao",
  question: "duvida",
  cancellation: "cancelamento",
  other: "outro",
};

const insightSchema = z.object({
  sentiment: z.preprocess(
    (v) => normalizeEnum(v, sentimentMap),
    z.enum(["positivo", "neutro", "negativo"])
  ),
  intent: z.preprocess(
    (v) => normalizeEnum(v, intentMap),
    z.enum(["compra", "suporte", "reclamacao", "duvida", "cancelamento", "outro"])
  ),
  urgency: z.number().int().min(1).max(5).optional().default(3),
  sales_stage: z
    .enum(["discovery", "qualification", "proposal", "negotiation", "closing", "post_sale", "unknown"])
    .optional()
    .default("unknown"),
  summary: z.string().trim().min(5),
  implicit_need: z.string().trim().optional().default(""),
  explicit_need: z.string().trim().optional().default(""),
  objections: z.array(z.string().trim().min(2)).max(5).optional().default([]),
  key_topics: z.array(z.string().trim().min(1)).max(5).optional().default([]),
  next_commitment: z.string().trim().optional().default(""),
  stall_reason: z.string().trim().optional().default(""),
  confidence_score: z.number().int().min(0).max(100).optional().default(65),
  suggested_response: z.string().trim().optional().default(""),
  action_items: z.array(z.string().trim().min(2)).max(6).optional().default(["Revisar conversa"]),
});

type InsightPayload = z.infer<typeof insightSchema>;
type InsightSalesStage = InsightPayload["sales_stage"];

type ConversationMessage = {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  sent_at: string | null;
  message_type?: string | null;
  media_url?: string | null;
};

type AnalyzeConversationResult = {
  conversationId: string;
  companyId: string;
  sentiment: "positivo" | "neutro" | "negativo";
  intent: string;
  urgency: number;
  salesStage: "discovery" | "qualification" | "proposal" | "negotiation" | "closing" | "post_sale" | "unknown";
  summary: string;
  implicitNeed: string;
  explicitNeed: string;
  objections: string[];
  actionItems: string[];
  keyTopics: string[];
  nextCommitment: string;
  stallReason: string;
  confidenceScore: number;
  suggestedResponse: string;
  generatedAt: string;
};

const KB_SEARCH_MESSAGE_LIMIT = 8;
const KB_SEARCH_MAX_CHARS = 1200;
const KB_CONTEXT_MATCH_THRESHOLD = 0.3;
const KB_CONTEXT_MATCH_COUNT = 4;
const KB_CONTEXT_MAX_CHARS = 3600;

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactMessageContent(content: string | null) {
  return (content ?? "").replace(/\s+/g, " ").trim();
}

function buildKnowledgeBaseSearchQuery(messages: ConversationMessage[]) {
  const recentMessages = messages
    .map((message) => ({
      direction: message.direction,
      content: compactMessageContent(message.content),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-KB_SEARCH_MESSAGE_LIMIT);

  if (recentMessages.length === 0) {
    return "";
  }

  const lastInboundMessage = [...recentMessages]
    .reverse()
    .find((message) => message.direction === "inbound");

  const conversationExcerpt = recentMessages
    .map((message) => {
      const speaker = message.direction === "inbound" ? "CLIENTE" : "ATENDIMENTO";
      return `${speaker}: ${message.content}`;
    })
    .join("\n");

  return [
    "Contexto para analisar conversa de WhatsApp com base na documentacao da empresa.",
    "Diagnosticar etapa da venda, necessidades implicitas/explicitas, gargalos do atendimento, perguntas que faltam e proximo compromisso.",
    lastInboundMessage
      ? `Necessidade mais recente do cliente: ${lastInboundMessage.content}`
      : null,
    "Trecho recente da conversa:",
    conversationExcerpt,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, KB_SEARCH_MAX_CHARS);
}

function buildPersonalConversationInsight(sentiment: InsightPayload["sentiment"]): InsightPayload {
  return {
    sentiment,
    intent: "outro",
    urgency: 1,
    sales_stage: "unknown",
    summary:
      "Conversa pessoal/informal detectada. Sem contexto comercial suficiente para classificar como oportunidade.",
    implicit_need: "",
    explicit_need: "",
    objections: [],
    key_topics: ["conversa pessoal"],
    next_commitment: "",
    stall_reason: "",
    confidence_score: 88,
    suggested_response: "",
    action_items: ["Nenhuma acao comercial necessaria - conversa pessoal."],
  };
}

function fallbackInsight(messages: ConversationMessage[]): InsightPayload {
  const assessment = assessConversationGuardrails(messages);

  if (assessment.isClearlyPersonal) {
    return buildPersonalConversationInsight(assessment.suggestedSentiment);
  }

  const combined = normalizeText(
    messages
      .map((message) => message.content ?? "")
      .join(" ")
      .slice(0, 6000)
  );

  const negativeWords = ["reclam", "cancel", "ruim", "atras", "problema", "insatisfeit"];
  const purchaseWords = ["preco", "compr", "orcamento", "proposta", "pagamento"];
  const supportWords = ["suporte", "ajuda", "erro", "nao funciona"];

  const hasNegative = negativeWords.some((word) => combined.includes(word));
  const hasPurchase = purchaseWords.some((word) => combined.includes(word));
  const hasSupport = supportWords.some((word) => combined.includes(word));

  const sentiment: "positivo" | "neutro" | "negativo" = hasNegative ? "negativo" : "neutro";
  let intent: InsightPayload["intent"] = "outro";
  const salesStage: InsightSalesStage = hasPurchase ? "qualification" : "unknown";

  if (hasPurchase) {
    intent = "compra";
  } else if (hasSupport) {
    intent = "suporte";
  } else if (hasNegative) {
    intent = "reclamacao";
  }

  return {
    sentiment,
    intent,
    urgency: hasNegative ? 4 : 3,
    sales_stage: salesStage,
    summary:
      "Analise gerada em modo de fallback. Recomenda-se revisar a conversa para confirmar detalhes comerciais e proximos passos.",
    implicit_need: "",
    explicit_need: "",
    objections: [],
    key_topics: [],
    next_commitment: "",
    stall_reason: hasNegative ? "Cliente demonstra atrito ou insatisfacao." : "",
    confidence_score: 35,
    suggested_response: "",
    action_items: [
      "Revisar a conversa e confirmar necessidade principal do cliente.",
      hasPurchase
        ? "Enviar proposta comercial com prazo claro."
        : "Responder com orientacao objetiva e prazo de retorno.",
    ],
  };
}

function applyInsightGuardrails(
  messages: ConversationMessage[],
  insight: InsightPayload
): InsightPayload {
  const assessment = assessConversationGuardrails(messages);

  if (!assessment.isClearlyPersonal) {
    return insight;
  }

  return {
    ...buildPersonalConversationInsight(assessment.suggestedSentiment),
    confidence_score: Math.max(insight.confidence_score, 88),
  };
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match?.[1]?.trim() ?? text.trim();
}

function parseAiResponse(rawContent: string) {
  const cleaned = extractJson(rawContent);
  const parsedUnknown: unknown = JSON.parse(cleaned);
  return insightSchema.parse(parsedUnknown);
}

async function generateConversationInsight(companyId: string, messages: ConversationMessage[]) {
  const assessment = assessConversationGuardrails(messages);

  if (assessment.isClearlyPersonal) {
    return buildPersonalConversationInsight(assessment.suggestedSentiment);
  }

  const kbSearchQuery = buildKnowledgeBaseSearchQuery(messages);
  const kbContext = kbSearchQuery
    ? await getKnowledgeBaseContext(companyId, kbSearchQuery, {
        includeGlobal: true,
        matchThreshold: KB_CONTEXT_MATCH_THRESHOLD,
        matchCount: KB_CONTEXT_MATCH_COUNT,
        maxChars: KB_CONTEXT_MAX_CHARS,
      })
    : "";

  const prompt = buildWhatsAppAnalysisPrompt({
    messages: messages.map((message) => ({
      direction: message.direction,
      content: message.content,
      sentAt: message.sent_at ?? new Date().toISOString(),
      messageType: message.message_type,
    })),
    knowledgeBaseContext: kbContext || undefined,
  });

  try {
    const rawJson = await openRouterChatCompletion(
      companyId,
      [
        {
          role: "system",
          content: "Voce responde apenas JSON valido, sem markdown e sem texto extra.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: process.env.OPENROUTER_MODEL_LIGHT,
      }
    );

    return applyInsightGuardrails(messages, parseAiResponse(rawJson));
  } catch (error) {
    console.error("[analyzer] Falha na chamada IA - usando fallback:", error);
    return applyInsightGuardrails(messages, fallbackInsight(messages));
  }
}

async function executeAutomaticActions(
  companyId: string,
  conversation: {
    external_id: string | null;
    contact_phone: string | null;
    remote_jid: string;
  },
  insight: {
    sentiment: "positivo" | "neutro" | "negativo";
    intent: string;
    summary: string;
  }
) {
  const client = await getSofiaCrmClient(companyId);
  const actions: string[] = [];

  if (insight.intent === "compra" && conversation.external_id) {
    try {
      const boards = await client.listBoards();
      const board = boards[0];
      if (board) {
        await client.createKanbanCard({
          boardId: String(board.id),
          title: `Oportunidade: ${conversation.remote_jid}`,
          description: insight.summary,
        });
        actions.push("kanban_card_created");
      } else {
        actions.push("kanban_card_skipped_no_board");
      }
    } catch {
      actions.push("kanban_card_failed");
    }
  }

  if (insight.sentiment === "negativo") {
    const contactId = conversation.contact_phone ?? conversation.remote_jid;
    try {
      await client.addContactLabel({
        contactId,
        label: "Atencao",
      });
      actions.push("negative_label_added");
    } catch {
      actions.push("negative_label_failed");
    }
  }

  return actions;
}

export async function analyzeConversation(
  companyId: string,
  conversationId: string
): Promise<AnalyzeConversationResult> {
  const supabase = createSupabaseAdminClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, company_id, external_id, contact_name, contact_phone, remote_jid")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .single();

  if (conversationError || !conversation?.id) {
    throw new Error("Conversa nao encontrada para esta empresa.");
  }

  const { data: rawMessages, error: messagesError } = await supabase
    .from("messages")
    .select("id, direction, content, sent_at, message_type, media_url")
    .eq("conversation_id", conversationId)
    .eq("company_id", companyId)
    .order("sent_at", { ascending: true });

  if (messagesError) {
    throw new Error("Falha ao carregar mensagens da conversa.");
  }

  if (!rawMessages || rawMessages.length === 0) {
    throw new Error("Conversa sem mensagens para analise.");
  }

  const messages = await enrichMediaMessages(
    companyId,
    rawMessages as unknown as ConversationMessage[]
  );

  const insight = await generateConversationInsight(companyId, messages);
  await executeAutomaticActions(companyId, conversation, {
    sentiment: insight.sentiment,
    intent: insight.intent,
    summary: insight.summary,
  });

  const generatedAt = new Date().toISOString();
  const enrichedActionItems = {
    items: insight.action_items,
    urgency: insight.urgency,
    suggested_response: insight.suggested_response,
    key_topics: insight.key_topics,
  };

  const { error: upsertError } = await supabase.from("conversation_insights").upsert(
    {
      company_id: companyId,
      conversation_id: conversationId,
      sentiment: insight.sentiment,
      intent: insight.intent,
      sales_stage: insight.sales_stage,
      summary: insight.summary,
      implicit_need: insight.implicit_need || null,
      explicit_need: insight.explicit_need || null,
      objections: insight.objections,
      next_commitment: insight.next_commitment || null,
      stall_reason: insight.stall_reason || null,
      confidence_score: insight.confidence_score,
      action_items: enrichedActionItems,
      generated_at: generatedAt,
    },
    {
      onConflict: "conversation_id",
    }
  );

  if (upsertError) {
    throw new Error("Falha ao salvar insight da conversa.");
  }

  if (insight.intent === "compra") {
    triggerPurchaseIntentAlert({
      companyId,
      conversationId,
      contactName: conversation.contact_name,
      contactPhone: conversation.contact_phone,
      summary: insight.summary,
    });
  }

  if (insight.sentiment === "negativo" && insight.urgency >= 4) {
    triggerNegativeSentimentAlert({
      companyId,
      conversationId,
      contactName: conversation.contact_name,
      contactPhone: conversation.contact_phone,
      urgency: insight.urgency,
      summary: insight.summary,
    });
  }

  return {
    conversationId,
    companyId,
    sentiment: insight.sentiment,
    intent: insight.intent,
    urgency: insight.urgency,
    salesStage: insight.sales_stage,
    summary: insight.summary,
    implicitNeed: insight.implicit_need,
    explicitNeed: insight.explicit_need,
    objections: insight.objections,
    actionItems: insight.action_items,
    keyTopics: insight.key_topics,
    nextCommitment: insight.next_commitment,
    stallReason: insight.stall_reason,
    confidenceScore: insight.confidence_score,
    suggestedResponse: insight.suggested_response,
    generatedAt,
  };
}

export type { AnalyzeConversationResult };
