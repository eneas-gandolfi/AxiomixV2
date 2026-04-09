/**
 * Arquivo: src/services/group-agent/message-filter.ts
 * Propósito: Filtro de qualidade para mensagens de grupo antes de alimentar o RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { parseAiJson } from "@/lib/ai/parse-ai-json";

const NOISE_PATTERNS = [
  /^(ok|sim|nao|n|s|ss|sss|tb|tbm|blz|vlw|tmj|top|show|tá|ta|pd|pdc|pdp|aham|uhum)$/i,
  /^(oi|ola|olá|bom dia|boa tarde|boa noite|e ai|e aí|fala|salve|hey|eae)$/i,
  /^(obrigad[oa]|valeu|brigad[oa]|thanks|thx|de nada|tmj|flw|falou)$/i,
  /^(kk+|haha+|rsrs+|kkk+|lol|kkkkk+)$/i,
  /^[\p{Emoji}\s]+$/u,
  /^\d{1,3}$/,
  /^[?!.…]+$/,
  /^(sim|não|nao)\s*[,.]?\s*$/i,
  /^https?:\/\/\S+$/i,
];

const HIGH_VALUE_PATTERNS = [
  /\b(decidimos|ficou definido|combinamos|aprovado|fechado)\b/i,
  /\b(prazo|deadline|entrega|data limite|vencimento)\b.*\d/i,
  /\b(meta|objetivo|target|kpi)\b.*\d/i,
  /\b(r\$|reais|mil|milhão|faturamento|receita)\b.*\d/i,
  /\b(contrato|proposta|orçamento|cotação)\b/i,
  /\b(problema|bug|erro|falha|reclamação|reclamacao)\b/i,
  /\b(solução|resolver|corrigir|implementar|desenvolver)\b/i,
  /\b(cliente|fornecedor|parceiro)\b.*\b(nome|telefone|email|contato)\b/i,
];

const BUSINESS_KEYWORDS = [
  "meta", "vendas", "venda", "cliente", "clientes", "proposta",
  "faturamento", "receita", "pipeline", "lead", "leads",
  "conversao", "conversão", "ticket", "pedido", "pedidos",
  "entrega", "produto", "servico", "serviço", "contrato",
  "orcamento", "orçamento", "pagamento", "comissao", "comissão",
  "resultado", "fechamento", "negociacao", "negociação",
  "relatorio", "relatório", "meta", "metas", "margem",
  "projeto", "sprint", "release", "deploy", "sistema",
];

/**
 * Filtro rápido baseado em regras (sem custo de API).
 * Retorna true se a mensagem parece ter valor informacional.
 */
export function isRagWorthy(content: string): boolean {
  const trimmed = content.trim();

  if (trimmed.length < 15) return false;

  const words = trimmed.split(/\s+/);
  if (words.length < 3) return false;

  const lower = trimmed.toLowerCase();
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(lower)) return false;
  }

  // Alta confiança: padrões de alto valor sempre passam
  for (const pattern of HIGH_VALUE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Mensagens com keywords de negócio e tamanho razoável passam
  const hasBusinessKeyword = BUSINESS_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasBusinessKeyword && words.length >= 5) return true;

  // Mensagens longas com estrutura (frases completas) passam
  if (words.length >= 8) return true;

  return false;
}

/**
 * Filtragem por IA em batch — classifica mensagens por relevância.
 * Retorna índices das mensagens que devem ser incluídas no RAG.
 * Usar apenas no rag-feeder (batch), não em tempo real.
 */
export async function filterMessagesWithAI(
  companyId: string,
  messages: Array<{ index: number; sender: string; content: string }>
): Promise<number[]> {
  if (messages.length === 0) return [];

  const numbered = messages
    .map((m) => `[${m.index}] ${m.sender}: ${m.content}`)
    .join("\n");

  const systemPrompt = `Você é um filtro de qualidade para uma base de conhecimento empresarial.
Analise as mensagens de grupo WhatsApp e classifique quais contêm informação útil para consultas futuras.

INCLUIR: decisões, dados, métricas, informações de clientes, pendências, instruções, contexto de negócio.
EXCLUIR: saudações, confirmações curtas, risadas, emojis, conversa trivial, links sem contexto, mensagens vagas.

Responda em JSON: { "keep": [lista de números dos índices a manter] }`;

  try {
    const raw = await openRouterChatCompletion(companyId, [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Mensagens para filtrar:\n${numbered}` },
    ], {
      responseFormat: "json",
      temperature: 0.1,
      maxTokens: 256,
      module: "group_agent",
      operation: "rag_filter",
    });

    const parsed = parseAiJson<{ keep: number[] }>(raw);
    if (parsed && Array.isArray(parsed.keep)) {
      return parsed.keep.filter((i) => typeof i === "number");
    }
    return messages.map((m) => m.index);
  } catch {
    // Fallback: manter todas (filtro básico já passou)
    return messages.map((m) => m.index);
  }
}

export function isReportContent(content: string): boolean {
  const lower = content.toLowerCase();

  const hasBusinessKeyword = BUSINESS_KEYWORDS.some((kw) => lower.includes(kw));
  const hasNumbers = /\d{2,}/.test(content);
  const hasBulletPoints = /^[\s]*[-•*]\s/m.test(content);
  const isMultiSentence = content.split(/[.!?\n]/).filter((s) => s.trim().length > 10).length >= 2;

  const score =
    (hasBusinessKeyword ? 2 : 0) +
    (hasNumbers ? 1 : 0) +
    (hasBulletPoints ? 1 : 0) +
    (isMultiSentence ? 1 : 0);

  return score >= 2;
}
