/**
 * Arquivo: src/lib/dashboard/insights/registry.ts
 * Propósito: Registry simples de InsightStrategy. Decisão arquitetural: closure
 *            ao invés de classe pra que `register` seja uma linha no setup do
 *            módulo (`registry.register(tfrBreachStrategy)`) e `run` seja
 *            stateless do ponto de vista do consumidor. Ordena por severity
 *            (red > amber > info) e depois por priority decrescente.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import type {
  Insight,
  InsightContext,
  InsightSeverity,
  InsightStrategy,
} from "@/lib/dashboard/insights/types";

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  red: 0,
  amber: 1,
  info: 2,
};

export type InsightRegistry = {
  register(strategy: InsightStrategy): void;
  run(context: InsightContext): Insight[];
  /** Apaga todos os strategies registrados — útil em testes. */
  clear(): void;
  /** Lista os ids dos strategies registrados — útil em debug e testes. */
  list(): string[];
};

export function createInsightRegistry(): InsightRegistry {
  const strategies = new Map<string, InsightStrategy>();

  return {
    register(strategy) {
      strategies.set(strategy.id, strategy);
    },
    run(context) {
      const insights: Insight[] = [];
      for (const strategy of strategies.values()) {
        const result = strategy.run(context);
        if (result) insights.push(result);
      }
      insights.sort((a, b) => {
        const sevDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sevDelta !== 0) return sevDelta;
        return b.priority - a.priority;
      });
      return insights;
    },
    clear() {
      strategies.clear();
    },
    list() {
      return Array.from(strategies.keys());
    },
  };
}
