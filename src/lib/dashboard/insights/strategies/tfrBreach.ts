/**
 * Arquivo: src/lib/dashboard/insights/strategies/tfrBreach.ts
 * Propósito: Insight prioritário do MVP — dispara quando há ≥1 conversa
 *            estourando o tempo de primeira resposta (TFR) configurado pro
 *            nicho. Expõe MAGNITUDE (TMR médio vs SLA) via metric — Sally,
 *            Caravaggio, John e Mary cravaram que insight sem número é
 *            fofoca. O HeroMetric mostra a CONTAGEM (quantas paradas);
 *            este card mostra QUANTO ESTOUROU.
 *
 *            Severidade do insight herda do pior caso na fila (red se houver
 *            qualquer red, senão amber). Assim o card cresce em urgência
 *            visual junto com a operação.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import type { InsightStrategy } from "@/lib/dashboard/insights/types";

const STRATEGY_ID = "tfr-breach";

function formatDuration(seconds: number): string {
  if (seconds >= 86400) return `${Math.round(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.max(1, Math.round(seconds / 60))}min`;
}

export const tfrBreachStrategy: InsightStrategy = {
  id: STRATEGY_ID,
  run(context) {
    const { stalled } = context;
    if (stalled.count === 0) return null;

    const hasRed = stalled.items.some((item) => item.severity === "red");
    const severity = hasRed ? "red" : "amber";
    const count = stalled.count;

    // TMR médio dos itens parados — é a magnitude do estouro. Não é a contagem
    // (essa fica no HeroMetric), é o "de quanto" estourou.
    const totalWait = stalled.items.reduce((sum, item) => sum + item.waitSeconds, 0);
    const avgWaitSeconds = stalled.items.length > 0 ? totalWait / stalled.items.length : 0;

    const avgWaitLabel = formatDuration(avgWaitSeconds);
    const thresholdLabel = formatDuration(stalled.amberSeconds);
    const conversationsLabel =
      count === 1 ? "1 conversa" : `${count} conversas`;

    const title = "Tempo de resposta estourou hoje";
    const body =
      "Vale conferir quem da equipe está com a fila mais cheia agora — pode ser bom redistribuir ou chamar reforço.";

    return {
      ruleId: STRATEGY_ID,
      severity,
      // Prioridade cresce com o número de conversas paradas (cap em 100).
      priority: Math.min(100, 50 + count * 10),
      title,
      body,
      ctaLabel: "Ver fila",
      ctaHref: "/whatsapp-intelligence?tab=operacao",
      metric: {
        value: avgWaitLabel,
        sub: `meta ${thresholdLabel} · em ${conversationsLabel}`,
      },
    };
  },
};
