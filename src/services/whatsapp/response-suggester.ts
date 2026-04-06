/**
 * Arquivo: src/services/whatsapp/response-suggester.ts
 * Propósito: Gerar sugestão de resposta IA para o atendente enviar ao cliente.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import "server-only";

import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { buildResponseSuggestionPrompt } from "@/lib/ai/prompts/whatsapp";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ConversationMessage = {
  direction: "inbound" | "outbound";
  content: string | null;
  sent_at: string | null;
  message_type?: string | null;
};

const KB_SEARCH_MESSAGE_LIMIT = 8;
const KB_SEARCH_MAX_CHARS = 1200;
const KB_CONTEXT_MATCH_THRESHOLD = 0.3;
const KB_CONTEXT_MATCH_COUNT = 4;
const KB_CONTEXT_MAX_CHARS = 3600;

function compactMessageContent(content: string | null) {
  return (content ?? "").replace(/\s+/g, " ").trim();
}

function buildKbSearchQuery(messages: ConversationMessage[]) {
  const recent = messages
    .filter((m) => compactMessageContent(m.content).length > 0)
    .slice(-KB_SEARCH_MESSAGE_LIMIT);

  if (recent.length === 0) return "";

  const lastInbound = [...recent]
    .reverse()
    .find((m) => m.direction === "inbound");

  const excerpt = recent
    .map((m) => {
      const speaker = m.direction === "inbound" ? "CLIENTE" : "ATENDIMENTO";
      return `${speaker}: ${compactMessageContent(m.content)}`;
    })
    .join("\n");

  return [
    "Contexto para sugerir resposta em conversa WhatsApp.",
    lastInbound
      ? `Ultima mensagem do cliente: ${compactMessageContent(lastInbound.content)}`
      : null,
    "Trecho recente:",
    excerpt,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, KB_SEARCH_MAX_CHARS);
}

export async function generateResponseSuggestion(
  companyId: string,
  conversationId: string
): Promise<string> {
  const supabase = createSupabaseAdminClient();

  // Buscar mensagens da conversa
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("direction, content, sent_at, message_type")
    .eq("conversation_id", conversationId)
    .eq("company_id", companyId)
    .order("sent_at", { ascending: true });

  if (messagesError) {
    throw new Error("Falha ao carregar mensagens da conversa.");
  }

  if (!messages || messages.length === 0) {
    throw new Error("Conversa sem mensagens para gerar sugestão.");
  }

  const typedMessages = messages as ConversationMessage[];

  // Buscar insight existente (se houver) para contexto
  const { data: insight } = await supabase
    .from("conversation_insights")
    .select("sentiment, intent, sales_stage, summary")
    .eq("conversation_id", conversationId)
    .eq("company_id", companyId)
    .maybeSingle();

  // Buscar contexto da base de conhecimento
  const kbSearchQuery = buildKbSearchQuery(typedMessages);
  const kbContext = kbSearchQuery
    ? await getKnowledgeBaseContext(companyId, kbSearchQuery, {
        includeGlobal: true,
        matchThreshold: KB_CONTEXT_MATCH_THRESHOLD,
        matchCount: KB_CONTEXT_MATCH_COUNT,
        maxChars: KB_CONTEXT_MAX_CHARS,
      })
    : "";

  // Montar prompt
  const prompt = buildResponseSuggestionPrompt({
    messages: typedMessages.map((m) => ({
      direction: m.direction,
      content: m.content,
      sentAt: m.sent_at ?? new Date().toISOString(),
      messageType: m.message_type,
    })),
    knowledgeBaseContext: kbContext || undefined,
    existingInsight: insight
      ? {
          sentiment: insight.sentiment ?? undefined,
          intent: insight.intent ?? undefined,
          salesStage: insight.sales_stage ?? undefined,
          summary: insight.summary ?? undefined,
        }
      : undefined,
  });

  // Chamar IA — formato texto puro
  const suggestion = await openRouterChatCompletion(
    companyId,
    [
      {
        role: "system",
        content:
          "Voce e um assistente de atendimento. Responda apenas com o texto da sugestao, sem aspas, sem JSON e sem explicacoes.",
      },
      { role: "user", content: prompt },
    ],
    {
      responseFormat: "text",
      model: process.env.OPENROUTER_MODEL_LIGHT,
      temperature: 0.4,
      maxTokens: 512,
      module: "whatsapp",
      operation: "suggest_response",
    }
  );

  return suggestion.trim();
}
