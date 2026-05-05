/**
 * Arquivo: src/lib/dashboard/insights/strategies/__tests__/tfrBreach.test.ts
 * Propósito: Validar a regra (c) do plano Winston — insight TFR breach.
 *            Cobre: silêncio quando nada parado, copy diferente pra 1 vs N,
 *            severity escala com pior caso da fila, priority cresce com count.
 */

import { describe, it, expect } from "vitest";
import { tfrBreachStrategy } from "@/lib/dashboard/insights/strategies/tfrBreach";
import type { InsightContext } from "@/lib/dashboard/insights/types";
import type { StalledItem } from "@/lib/dashboard/selectors/stalledConversations";

function makeContext(items: StalledItem[]): InsightContext {
  return {
    nicheSlug: "varejo",
    stalled: {
      count: items.length,
      items,
      amberSeconds: 600,
      redSeconds: 1200,
    },
  };
}

function item(id: string, severity: "amber" | "red"): StalledItem {
  return {
    conversationId: id,
    customerName: `Cliente ${id}`,
    waitSeconds: severity === "red" ? 1500 : 800,
    severity,
  };
}

describe("tfrBreachStrategy", () => {
  it("retorna null quando ninguém está parado (silêncio)", () => {
    const result = tfrBreachStrategy.run(makeContext([]));
    expect(result).toBeNull();
  });

  it("dispara amber quando há ≥1 conversa âmbar mas nenhuma vermelha", () => {
    const result = tfrBreachStrategy.run(makeContext([item("c1", "amber")]));
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("amber");
    expect(result!.ruleId).toBe("tfr-breach");
  });

  it("escala pra red quando ≥1 conversa está vermelha", () => {
    const result = tfrBreachStrategy.run(
      makeContext([item("c1", "amber"), item("c2", "red")]),
    );
    expect(result!.severity).toBe("red");
  });

  it("título não repete número (já está no HeroMetric ao lado, evita redundância)", () => {
    const result = tfrBreachStrategy.run(makeContext([item("c1", "amber")]));
    expect(result!.title).toBe("Tempo de resposta estourou hoje");
    expect(result!.title).not.toMatch(/\d/);
  });

  it("body foca em diagnóstico, não em eco da contagem do hero", () => {
    const items = [
      item("c1", "amber"),
      item("c2", "amber"),
      item("c3", "red"),
    ];
    const result = tfrBreachStrategy.run(makeContext(items));
    expect(result!.body).toContain("equipe");
    expect(result!.body).not.toMatch(/^\d/);
  });

  it("priority cresce com count (50 + 10*count, cap 100)", () => {
    const r1 = tfrBreachStrategy.run(makeContext([item("c1", "amber")]));
    const r3 = tfrBreachStrategy.run(
      makeContext([
        item("c1", "amber"),
        item("c2", "amber"),
        item("c3", "amber"),
      ]),
    );
    expect(r1!.priority).toBe(60);
    expect(r3!.priority).toBe(80);
  });

  it("priority cap em 100 mesmo com fila gigante", () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      item(`c${i}`, "red"),
    );
    const result = tfrBreachStrategy.run(makeContext(items));
    expect(result!.priority).toBe(100);
  });

  it("CTA aponta pra aba Operação (1 clique pra resolver)", () => {
    const result = tfrBreachStrategy.run(makeContext([item("c1", "amber")]));
    expect(result!.ctaLabel).toBe("Ver fila");
    expect(result!.ctaHref).toBe("/whatsapp-intelligence?tab=operacao");
  });
});
