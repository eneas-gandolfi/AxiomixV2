/**
 * Arquivo: src/lib/whatsapp/funil-comercial.ts
 * Proposito: Pure function que monta o funil comercial acumulado a partir do
 *            campo `sales_stage` de `conversation_insights`. Usa contagem
 *            acumulada (quem chegou a esse estagio ou alem) — mais intuitivo
 *            que contar por estagio isolado.
 *
 *            Identifica o gargalo: maior queda absoluta entre estagios
 *            consecutivos.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

export type SalesStage =
  | "discovery"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closing"
  | "post_sale"
  | "unknown";

export const SALES_STAGE_LABEL: Record<SalesStage, string> = {
  discovery: "Descoberta",
  qualification: "Qualificacao",
  proposal: "Proposta",
  negotiation: "Negociacao",
  closing: "Fechamento",
  post_sale: "Pos-venda",
  unknown: "Nao classificado",
};

const STAGE_ORDER: SalesStage[] = [
  "discovery",
  "qualification",
  "proposal",
  "negotiation",
  "closing",
  "post_sale",
];

function normalizeStage(raw: string | null | undefined): SalesStage {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if ((STAGE_ORDER as string[]).includes(lower)) return lower as SalesStage;
  return "unknown";
}

export type FunilStage = {
  stage: SalesStage;
  label: string;
  count: number;
  /** % do estagio em relacao ao topo (discovery) */
  pctOfTop: number;
  /** % do estagio em relacao ao estagio imediatamente anterior */
  pctOfPrevious: number;
};

export type FunilResult = {
  stages: FunilStage[];
  totalAnalyzed: number;
  bottleneckIndex: number | null;
  /** Pontos percentuais perdidos no gargalo (drop vs estagio anterior) */
  bottleneckDropPp: number;
};

export type InsightStageRow = {
  conversationId: string;
  salesStage: string | null;
};

export function computeFunilFromInsights(
  insights: InsightStageRow[],
): FunilResult {
  const seenConvs = new Set<string>();
  const stageCounts: Record<SalesStage, number> = {
    discovery: 0,
    qualification: 0,
    proposal: 0,
    negotiation: 0,
    closing: 0,
    post_sale: 0,
    unknown: 0,
  };

  for (const ins of insights) {
    if (!ins.conversationId) continue;
    if (seenConvs.has(ins.conversationId)) continue;
    seenConvs.add(ins.conversationId);
    const stage = normalizeStage(ins.salesStage);
    stageCounts[stage] += 1;
  }

  const totalAnalyzed = seenConvs.size;

  // Acumulado: cada estagio conta quem chegou ate ele ou alem.
  const accumulated: number[] = STAGE_ORDER.map((_, idx) =>
    STAGE_ORDER.slice(idx).reduce((sum, s) => sum + stageCounts[s], 0),
  );

  const top = accumulated[0] || 0;
  const stages: FunilStage[] = STAGE_ORDER.map((stage, idx) => {
    const count = accumulated[idx];
    const prev = idx === 0 ? count : accumulated[idx - 1];
    return {
      stage,
      label: SALES_STAGE_LABEL[stage],
      count,
      pctOfTop: top > 0 ? (count / top) * 100 : 0,
      pctOfPrevious: prev > 0 ? (count / prev) * 100 : 0,
    };
  });

  let bottleneckIndex: number | null = null;
  let worstDrop = 0;
  for (let i = 1; i < stages.length; i++) {
    const prevCount = stages[i - 1].count;
    if (prevCount === 0) continue;
    const drop = prevCount - stages[i].count;
    const dropPp = (drop / prevCount) * 100;
    if (dropPp > worstDrop && drop > 0) {
      worstDrop = dropPp;
      bottleneckIndex = i;
    }
  }

  return {
    stages,
    totalAnalyzed,
    bottleneckIndex,
    bottleneckDropPp: Math.round(worstDrop),
  };
}
