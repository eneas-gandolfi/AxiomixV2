/**
 * Arquivo: src/services/group-agent/message-filter.ts
 * Propósito: Filtro de qualidade para mensagens de grupo antes de alimentar o RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

const NOISE_PATTERNS = [
  /^(ok|sim|nao|n|s|ss|sss|tb|tbm|blz|vlw|tmj|top|show)$/i,
  /^(oi|ola|bom dia|boa tarde|boa noite|e ai|fala|salve)$/i,
  /^(obrigad[oa]|valeu|brigad[oa]|thanks|thx)$/i,
  /^(kk+|haha+|rsrs+|kkk+)$/i,
  /^[\p{Emoji}\s]+$/u,
  /^\d{1,3}$/,
];

const BUSINESS_KEYWORDS = [
  "meta", "vendas", "venda", "cliente", "clientes", "proposta",
  "faturamento", "receita", "pipeline", "lead", "leads",
  "conversao", "conversão", "ticket", "pedido", "pedidos",
  "entrega", "produto", "servico", "serviço", "contrato",
  "orcamento", "orçamento", "pagamento", "comissao", "comissão",
  "resultado", "fechamento", "negociacao", "negociação",
  "relatorio", "relatório", "meta", "metas", "margem",
];

export function isRagWorthy(content: string): boolean {
  const trimmed = content.trim();

  if (trimmed.length < 20) return false;

  const words = trimmed.split(/\s+/);
  if (words.length < 3) return false;

  const lower = trimmed.toLowerCase();
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(lower)) return false;
  }

  return true;
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
