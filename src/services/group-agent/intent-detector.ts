/**
 * Arquivo: src/services/group-agent/intent-detector.ts
 * Propósito: Detectar a intenção do usuário ao mencionar o agente no grupo.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import type { GroupAgentIntent } from "@/types/modules/group-agent.types";

type IntentResult = {
  intent: GroupAgentIntent;
  cleanedQuery: string;
};

const GREETING_PATTERNS = new Set([
  "", "oi", "olá", "ola", "bom dia", "boa tarde", "boa noite",
  "hey", "eai", "e ai", "fala", "salve",
]);

const INTENT_KEYWORDS: Record<GroupAgentIntent, string[]> = {
  summary: [
    "resumo", "resumir", "resuma", "ultimas mensagens", "o que rolou",
    "o que aconteceu", "recap", "sintetize", "sintetizar",
  ],
  sales_data: [
    "dados", "vendas", "pipeline", "metricas", "métricas", "numeros",
    "números", "faturamento", "conversao", "conversão", "fechamento",
    "quantos", "quantas", "quanto", "ticket medio", "ticket médio",
  ],
  report: [
    "relatorio", "relatório", "report", "gerar relatorio", "gerar relatório",
  ],
  suggestion: [
    "sugestao", "sugestão", "sugira", "o que fazer", "proximo passo",
    "próximo passo", "recomendacao", "recomendação", "dica", "conselho",
  ],
  greeting: [],
  rag_query: [],
  general: [],
};

function stripTrigger(message: string, triggerKeywords: string[]): string {
  let cleaned = message.trim();
  for (const keyword of triggerKeywords) {
    const lower = cleaned.toLowerCase();
    const kwLower = keyword.toLowerCase().trim();
    if (lower.startsWith(kwLower)) {
      cleaned = cleaned.slice(kwLower.length).trim();
      if (cleaned.startsWith(",") || cleaned.startsWith(":")) {
        cleaned = cleaned.slice(1).trim();
      }
      break;
    }
  }
  return cleaned;
}

export function detectGroupAgentIntent(
  messageContent: string,
  triggerKeywords: string[]
): IntentResult {
  const cleanedQuery = stripTrigger(messageContent, triggerKeywords);
  const lower = cleanedQuery.toLowerCase().trim();

  // Trigger vazio ou saudação simples
  if (GREETING_PATTERNS.has(lower)) {
    return { intent: "greeting", cleanedQuery };
  }

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as Array<[GroupAgentIntent, string[]]>) {
    if (keywords.length === 0) continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { intent, cleanedQuery };
      }
    }
  }

  if (cleanedQuery.endsWith("?") || /^(o que|como|qual|quem|quando|onde|por que|porque)/i.test(lower)) {
    return { intent: "rag_query", cleanedQuery };
  }

  return { intent: "general", cleanedQuery };
}
