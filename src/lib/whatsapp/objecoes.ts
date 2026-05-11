/**
 * Arquivo: src/lib/whatsapp/objecoes.ts
 * Proposito: Classificar e agregar objecoes vindas de `conversation_insights.objections`
 *            (string[] populado pela IA). Mapeia texto livre para 8 buckets
 *            canonicos via keyword match: preco, prazo, garantia, frete,
 *            pagamento, qualidade, atendimento, outros.
 *
 *            Retorna ranking ordenado por count desc para alimentar a UI
 *            "Objecoes mais frequentes".
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

export type ObjecaoCategoria =
  | "preco"
  | "prazo"
  | "garantia"
  | "frete"
  | "pagamento"
  | "qualidade"
  | "atendimento"
  | "outros";

const CATEGORIA_LABEL: Record<ObjecaoCategoria, string> = {
  preco: "Preco",
  prazo: "Prazo",
  garantia: "Garantia",
  frete: "Frete",
  pagamento: "Pagamento",
  qualidade: "Qualidade",
  atendimento: "Atendimento",
  outros: "Outros",
};

const KEYWORDS: Record<Exclude<ObjecaoCategoria, "outros">, string[]> = {
  preco: ["preco", "preço", "caro", "barato", "valor", "desconto", "promocao", "promoção", "custo"],
  prazo: ["prazo", "demora", "rapido", "rápido", "lento", "entrega", "tempo", "atraso"],
  garantia: ["garantia", "troca", "devolucao", "devolução", "defeito", "estraga"],
  frete: ["frete", "envio", "shipping", "transportadora", "correios"],
  pagamento: ["pagamento", "parcela", "boleto", "pix", "cartao", "cartão", "credit", "à vista", "a vista"],
  qualidade: ["qualidade", "ruim", "péssimo", "pessimo", "fraco", "frágil", "fragil", "feio"],
  atendimento: ["atendimento", "demora atender", "demoraram", "ninguem", "ninguém", "rude", "grosseria", "educacao"],
};

export function classifyObjection(raw: string): ObjecaoCategoria {
  const normalized = raw.toLowerCase();
  for (const [categoria, keywords] of Object.entries(KEYWORDS) as Array<
    [Exclude<ObjecaoCategoria, "outros">, string[]]
  >) {
    if (keywords.some((kw) => normalized.includes(kw))) return categoria;
  }
  return "outros";
}

export type ObjecaoBucket = {
  categoria: ObjecaoCategoria;
  label: string;
  count: number;
  examples: string[];
};

export type AggregateObjectionsInput = {
  objectionsPerInsight: string[][];
};

export function aggregateObjections({
  objectionsPerInsight,
}: AggregateObjectionsInput): ObjecaoBucket[] {
  const buckets = new Map<ObjecaoCategoria, ObjecaoBucket>();

  for (const arr of objectionsPerInsight) {
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (trimmed.length < 2) continue;
      const categoria = classifyObjection(trimmed);
      const existing = buckets.get(categoria);
      if (existing) {
        existing.count += 1;
        if (existing.examples.length < 3 && !existing.examples.includes(trimmed)) {
          existing.examples.push(trimmed);
        }
      } else {
        buckets.set(categoria, {
          categoria,
          label: CATEGORIA_LABEL[categoria],
          count: 1,
          examples: [trimmed],
        });
      }
    }
  }

  const result = Array.from(buckets.values());
  result.sort((a, b) => b.count - a.count || a.categoria.localeCompare(b.categoria));
  return result;
}

export function parseObjectionsField(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}
