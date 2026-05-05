/**
 * Arquivo: src/lib/dashboard/insights/__tests__/registry.test.ts
 * Propósito: Garantir que o registry é extensível (1 linha pra registrar nova
 *            strategy), ordena corretamente por severity + priority, e
 *            funciona vazio (sem strategy nenhuma).
 */

import { describe, it, expect } from "vitest";
import { createInsightRegistry } from "@/lib/dashboard/insights/registry";
import {
  createDefaultInsightRegistry,
} from "@/lib/dashboard/insights/defaultRegistry";
import type {
  Insight,
  InsightContext,
  InsightStrategy,
} from "@/lib/dashboard/insights/types";

const emptyContext: InsightContext = {
  nicheSlug: "varejo",
  stalled: {
    count: 0,
    items: [],
    amberSeconds: 600,
    redSeconds: 1200,
  },
};

function makeStrategy(
  id: string,
  insight: Omit<Insight, "ruleId">,
): InsightStrategy {
  return {
    id,
    run: () => ({ ...insight, ruleId: id }),
  };
}

describe("createInsightRegistry", () => {
  it("retorna [] quando nenhuma strategy registrada (AC-F3.1 vazio)", () => {
    const registry = createInsightRegistry();
    expect(registry.run(emptyContext)).toEqual([]);
    expect(registry.list()).toEqual([]);
  });

  it("registra strategy nova com 1 chamada (AC-F3.2 extensível)", () => {
    const registry = createInsightRegistry();
    const strategy = makeStrategy("test-1", {
      severity: "info",
      priority: 50,
      title: "T",
      body: "B",
      ctaLabel: "CTA",
      ctaHref: "/",
    });

    registry.register(strategy);

    expect(registry.list()).toEqual(["test-1"]);
    expect(registry.run(emptyContext)).toHaveLength(1);
  });

  it("descarta retorno null (strategy que decide não disparar)", () => {
    const registry = createInsightRegistry();
    registry.register({ id: "silent", run: () => null });
    expect(registry.run(emptyContext)).toEqual([]);
  });

  it("ordena red > amber > info, depois priority desc", () => {
    const registry = createInsightRegistry();
    registry.register(
      makeStrategy("info-high", {
        severity: "info",
        priority: 99,
        title: "info",
        body: "",
        ctaLabel: "",
        ctaHref: "/",
      }),
    );
    registry.register(
      makeStrategy("amber-low", {
        severity: "amber",
        priority: 10,
        title: "amber",
        body: "",
        ctaLabel: "",
        ctaHref: "/",
      }),
    );
    registry.register(
      makeStrategy("red-low", {
        severity: "red",
        priority: 1,
        title: "red",
        body: "",
        ctaLabel: "",
        ctaHref: "/",
      }),
    );

    const result = registry.run(emptyContext);

    expect(result.map((i) => i.ruleId)).toEqual([
      "red-low",
      "amber-low",
      "info-high",
    ]);
  });

  it("dentro da mesma severity, ordena por priority desc (tie-break)", () => {
    const registry = createInsightRegistry();
    registry.register(
      makeStrategy("a", {
        severity: "amber",
        priority: 30,
        title: "A",
        body: "",
        ctaLabel: "",
        ctaHref: "/",
      }),
    );
    registry.register(
      makeStrategy("b", {
        severity: "amber",
        priority: 70,
        title: "B",
        body: "",
        ctaLabel: "",
        ctaHref: "/",
      }),
    );

    const result = registry.run(emptyContext);
    expect(result.map((i) => i.ruleId)).toEqual(["b", "a"]);
  });

  it("clear() esvazia o registry (suporte a testes)", () => {
    const registry = createInsightRegistry();
    registry.register({ id: "x", run: () => null });
    expect(registry.list()).toHaveLength(1);
    registry.clear();
    expect(registry.list()).toEqual([]);
  });

  it("registrar mesma id duas vezes substitui a anterior (sem duplicar)", () => {
    const registry = createInsightRegistry();
    registry.register({ id: "dup", run: () => null });
    registry.register({ id: "dup", run: () => null });
    expect(registry.list()).toEqual(["dup"]);
  });
});

describe("createDefaultInsightRegistry (bootstrap MVP)", () => {
  it("registra apenas tfr-breach no MVP varejo (AC-F3.1 single strategy)", () => {
    const registry = createDefaultInsightRegistry();
    expect(registry.list()).toEqual(["tfr-breach"]);
  });

  it("retorna [] quando ninguém está parado (insight vazio = tudo em dia)", () => {
    const registry = createDefaultInsightRegistry();
    const result = registry.run(emptyContext);
    expect(result).toEqual([]);
  });
});
