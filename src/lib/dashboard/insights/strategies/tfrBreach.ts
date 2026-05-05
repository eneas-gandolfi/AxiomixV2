/**
 * Arquivo: src/lib/dashboard/insights/strategies/tfrBreach.ts
 * Propósito: Insight prioritário do MVP — dispara quando há ≥1 conversa
 *            estourando o tempo de primeira resposta (TFR) configurado pro
 *            nicho. Copy em tom de pergunta acionável (Sally's red line:
 *            "Maria é dona, não funcionária dela mesma").
 *
 *            Severidade do insight herda do pior caso na fila (red se houver
 *            qualquer red, senão amber). Assim o card cresce em urgência
 *            visual junto com a operação.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import type { InsightStrategy } from "@/lib/dashboard/insights/types";

const STRATEGY_ID = "tfr-breach";

export const tfrBreachStrategy: InsightStrategy = {
  id: STRATEGY_ID,
  run(context) {
    const { stalled } = context;
    if (stalled.count === 0) return null;

    const hasRed = stalled.items.some((item) => item.severity === "red");
    const severity = hasRed ? "red" : "amber";
    const count = stalled.count;

    // Sem repetir o número (que já aparece no HeroMetric ao lado). Foco do
    // insight é DIAGNÓSTICO + investigação, não eco da contagem do hero.
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
    };
  },
};
