/**
 * Arquivo: src/lib/whatsapp/__tests__/funil-comercial.test.ts
 * Proposito: Validar contagem acumulada do funil, deteccao de gargalo e
 *            tolerancia a valores invalidos no sales_stage.
 */

import { describe, it, expect } from "vitest";
import {
  computeFunilFromInsights,
  type InsightStageRow,
} from "@/lib/whatsapp/funil-comercial";

describe("computeFunilFromInsights", () => {
  it("retorna stages com count zero quando nao ha insights", () => {
    const result = computeFunilFromInsights([]);
    expect(result.totalAnalyzed).toBe(0);
    expect(result.stages.every((s) => s.count === 0)).toBe(true);
    expect(result.bottleneckIndex).toBeNull();
  });

  it("acumula corretamente do topo ate o estagio mais profundo", () => {
    const insights: InsightStageRow[] = [
      { conversationId: "1", salesStage: "discovery" },
      { conversationId: "2", salesStage: "qualification" },
      { conversationId: "3", salesStage: "qualification" },
      { conversationId: "4", salesStage: "proposal" },
      { conversationId: "5", salesStage: "closing" },
    ];
    const result = computeFunilFromInsights(insights);
    expect(result.totalAnalyzed).toBe(5);
    const byStage = Object.fromEntries(result.stages.map((s) => [s.stage, s.count]));
    expect(byStage.discovery).toBe(5);
    expect(byStage.qualification).toBe(4);
    expect(byStage.proposal).toBe(2);
    expect(byStage.negotiation).toBe(1);
    expect(byStage.closing).toBe(1);
    expect(byStage.post_sale).toBe(0);
  });

  it("detecta gargalo no estagio com maior queda %", () => {
    const insights: InsightStageRow[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        conversationId: `q${i}`,
        salesStage: "qualification",
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        conversationId: `p${i}`,
        salesStage: "proposal",
      })),
      { conversationId: "c1", salesStage: "closing" },
    ];
    const result = computeFunilFromInsights(insights);
    // proposal(9)->negotiation(1): drop 89% > qualification(19)->proposal(9): drop 53%
    expect(result.bottleneckIndex).toBeGreaterThan(0);
    expect(result.bottleneckDropPp).toBeGreaterThan(50);
  });

  it("ignora insights duplicados pela mesma conversation", () => {
    const insights: InsightStageRow[] = [
      { conversationId: "c1", salesStage: "discovery" },
      { conversationId: "c1", salesStage: "proposal" },
    ];
    const result = computeFunilFromInsights(insights);
    expect(result.totalAnalyzed).toBe(1);
  });

  it("trata sales_stage invalido como unknown (nao conta no funil acumulado)", () => {
    const insights: InsightStageRow[] = [
      { conversationId: "c1", salesStage: "discovery" },
      { conversationId: "c2", salesStage: "invalid_stage" },
    ];
    const result = computeFunilFromInsights(insights);
    const discovery = result.stages.find((s) => s.stage === "discovery")!;
    expect(discovery.count).toBe(1);
  });

  it("calcula pctOfTop e pctOfPrevious", () => {
    const insights: InsightStageRow[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        conversationId: `d${i}`,
        salesStage: "discovery",
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        conversationId: `q${i}`,
        salesStage: "qualification",
      })),
    ];
    const result = computeFunilFromInsights(insights);
    const qual = result.stages.find((s) => s.stage === "qualification")!;
    expect(qual.count).toBe(5);
    expect(qual.pctOfTop).toBe((5 / 15) * 100);
    expect(qual.pctOfPrevious).toBe((5 / 15) * 100);
  });
});
