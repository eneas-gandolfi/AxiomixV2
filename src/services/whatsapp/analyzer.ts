/**
 * Arquivo: src/services/whatsapp/analyzer.ts
 * Proposito: Analisar conversas com IA e aplicar acoes automaticas no Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { buildWhatsAppAnalysisPrompt } from "@/lib/ai/prompts/whatsapp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";
import {
  triggerPurchaseIntentAlert,
  triggerNegativeSentimentAlert,
} from "@/services/alerts/alert-triggers";

const insightSchema = z.object({
  sentiment: z.enum(["positivo", "neutro", "negativo"]),
  intent: z
    .enum(["compra", "suporte", "reclamacao", "duvida", "cancelamento", "outro"])
    .transform((value) => {
      if (value === "reclamacao") {
        return "reclamacao";
      }
      return value;
    }),
  urgency: z.number().int().min(1).max(5).optional().default(3),
  summary: z.string().trim().min(5),
  key_topics: z.array(z.string().trim().min(1)).max(5).optional().default([]),
  suggested_response: z.string().trim().optional().default(""),
  action_items: z.array(z.string().trim().min(2)).min(1).max(6),
});

type ConversationMessage = {
  direction: "inbound" | "outbound";
  content: string | null;
  sent_at: string | null;
};

type AnalyzeConversationResult = {
  conversationId: string;
  companyId: string;
  sentiment: "positivo" | "neutro" | "negativo";
  intent: string;
  urgency: number;
  summary: string;
  actionItems: string[];
  keyTopics: string[];
  suggestedResponse: string;
  generatedAt: string;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fallbackInsight(messages: ConversationMessage[]) {
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
  let intent = "outro";

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
    summary:
      "Analise gerada em modo de fallback. Recomenda-se revisar a conversa para confirmar detalhes comerciais e proximos passos.",
    key_topics: [] as string[],
    suggested_response: "",
    action_items: [
      "Revisar a conversa e confirmar necessidade principal do cliente.",
      hasPurchase
        ? "Enviar proposta comercial com prazo claro."
        : "Responder com orientacao objetiva e prazo de retorno.",
    ],
  };
}

function parseAiResponse(rawContent: string) {
  const parsedUnknown: unknown = JSON.parse(rawContent);
  return insightSchema.parse(parsedUnknown);
}

async function generateConversationInsight(companyId: string, messages: ConversationMessage[]) {
  const prompt = buildWhatsAppAnalysisPrompt(
    messages.map((message) => ({
      direction: message.direction,
      content: message.content,
      sentAt: message.sent_at ?? new Date().toISOString(),
    }))
  );

  try {
    const rawJson = await openRouterChatCompletion(companyId, [
      {
        role: "system",
        content: "Voce responde apenas JSON valido, sem markdown e sem texto extra.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    return parseAiResponse(rawJson);
  } catch {
    return fallbackInsight(messages);
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
      await client.createKanbanCard({
        boardId: client.inboxId,
        title: `Oportunidade: ${conversation.remote_jid}`,
        description: insight.summary,
      });
      actions.push("kanban_card_created");
    } catch {
      actions.push("kanban_card_failed");
    }
  }

  if (insight.sentiment === "negativo") {
    const contactId = conversation.contact_phone ?? conversation.remote_jid;
    try {
      await client.addContactLabel({
        contactId,
        label: "Atenção",
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
    .select("id, company_id, external_id, contact_phone, remote_jid")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .single();

  if (conversationError || !conversation?.id) {
    throw new Error("Conversa nao encontrada para esta empresa.");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("direction, content, sent_at")
    .eq("conversation_id", conversationId)
    .eq("company_id", companyId)
    .order("sent_at", { ascending: true });

  if (messagesError) {
    throw new Error("Falha ao carregar mensagens da conversa.");
  }

  if (!messages || messages.length === 0) {
    throw new Error("Conversa sem mensagens para analise.");
  }

  const insight = await generateConversationInsight(companyId, messages as ConversationMessage[]);
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
      summary: insight.summary,
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

  // --- Alertas em tempo real (fire-and-forget) ---
  if (insight.intent === "compra") {
    triggerPurchaseIntentAlert({
      companyId,
      conversationId,
      contactName: conversation.contact_phone,
      contactPhone: conversation.contact_phone,
      summary: insight.summary,
    });
  }

  if (insight.sentiment === "negativo" && insight.urgency >= 4) {
    triggerNegativeSentimentAlert({
      companyId,
      conversationId,
      contactName: conversation.contact_phone,
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
    summary: insight.summary,
    actionItems: insight.action_items,
    keyTopics: insight.key_topics,
    suggestedResponse: insight.suggested_response,
    generatedAt,
  };
}

export type { AnalyzeConversationResult };
