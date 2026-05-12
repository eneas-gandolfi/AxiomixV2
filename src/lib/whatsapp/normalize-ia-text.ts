/**
 * Corrige acentos faltando em saídas da IA (gerada a partir de prompts/modelos
 * que às vezes omitem diacríticos PT-BR) e capitaliza categorias canônicas.
 *
 * Aplicado no display — não persiste. Mantém intacto qualquer texto humano.
 */

const CANONICAL_INTENTS: Record<string, string> = {
  reclamacao: "Reclamação",
  reclamação: "Reclamação",
  duvida: "Dúvida",
  dúvida: "Dúvida",
  suporte: "Suporte",
  compra: "Compra",
  venda: "Venda",
  cancelamento: "Cancelamento",
  agradecimento: "Agradecimento",
  elogio: "Elogio",
  informacao: "Informação",
  informação: "Informação",
};

const CANONICAL_STAGES: Record<string, string> = {
  discovery: "Discovery",
  qualification: "Qualificação",
  qualificacao: "Qualificação",
  qualificação: "Qualificação",
  proposal: "Proposta",
  proposta: "Proposta",
  negotiation: "Negociação",
  negociacao: "Negociação",
  negociação: "Negociação",
  closing: "Fechamento",
  fechamento: "Fechamento",
  post_sale: "Pós-venda",
  "pos-venda": "Pós-venda",
  "pós-venda": "Pós-venda",
};

const CANONICAL_SENTIMENT: Record<string, string> = {
  positivo: "positivo",
  negativo: "negativo",
  neutro: "neutro",
};

/** Pares plain → accented. Aplicados como word-boundary, case-insensitive,
 *  preservando capitalização do match original (Nao → Não, nao → não). */
const ACCENT_PAIRS: Array<[string, string]> = [
  ["insatisfacao", "insatisfação"],
  ["satisfacao", "satisfação"],
  ["atencao", "atenção"],
  ["preocupacao", "preocupação"],
  ["intencao", "intenção"],
  ["situacao", "situação"],
  ["condicao", "condição"],
  ["decisao", "decisão"],
  ["proposicao", "proposição"],
  ["comercializacao", "comercialização"],
  ["informacao", "informação"],
  ["negociacao", "negociação"],
  ["aprovacao", "aprovação"],
  ["confirmacao", "confirmação"],
  ["devolucao", "devolução"],
  ["solucao", "solução"],
  ["objecao", "objeção"],
  ["nao", "não"],
  ["ja", "já"],
  ["proximo", "próximo"],
  ["proxima", "próxima"],
  ["duvida", "dúvida"],
  ["duvidas", "dúvidas"],
  ["urgencia", "urgência"],
  ["comercio", "comércio"],
  ["credito", "crédito"],
  ["debito", "débito"],
  ["pos-venda", "pós-venda"],
];

function preserveCase(match: string, replacement: string): string {
  if (!match) return replacement;
  if (match[0] === match[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function fixAccents(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  for (const [plain, accented] of ACCENT_PAIRS) {
    const pattern = new RegExp(`\\b${plain}\\b`, "gi");
    out = out.replace(pattern, (m) => preserveCase(m, accented));
  }
  return out;
}

export function canonicalIntent(intent: string | null | undefined): string {
  if (!intent) return "";
  const key = intent.trim().toLowerCase();
  return CANONICAL_INTENTS[key] ?? fixAccents(intent);
}

export function canonicalStage(stage: string | null | undefined): string {
  if (!stage) return "Indefinido";
  const key = stage.trim().toLowerCase();
  return CANONICAL_STAGES[key] ?? fixAccents(stage);
}

export function canonicalSentiment(sentiment: string | null | undefined): string {
  if (!sentiment) return "";
  const key = sentiment.trim().toLowerCase();
  return CANONICAL_SENTIMENT[key] ?? sentiment.toLowerCase();
}
