/**
 * Arquivo: src/lib/whatsapp/__tests__/recomendacoes.test.ts
 * Proposito: Validar regras de geracao das recomendacoes (cold por vendedor,
 *            gap critico, objecao recorrente, TFR acima do SLA) e ordenacao
 *            por nivel.
 */

import { describe, it, expect } from "vitest";
import { generateRecomendacoes } from "@/lib/whatsapp/recomendacoes";
import type { ColdLead } from "@/lib/whatsapp/cold-leads";
import type { ObjecaoBucket } from "@/lib/whatsapp/objecoes";
import type { HeatmapCell } from "@/lib/whatsapp/heatmap-resposta";

function makeCold(overrides: Partial<ColdLead> & { conversationId: string }): ColdLead {
  return {
    contactName: "Lead",
    contactPhone: null,
    assignedTo: "v1",
    lastMessageAt: new Date().toISOString(),
    lastSender: "lead",
    diasSemResposta: 5,
    motivo: "vendedor_nao_respondeu",
    ...overrides,
  };
}

function makeGap(overrides: Partial<HeatmapCell>): HeatmapCell {
  return {
    day: "mon",
    hour: 12,
    inboundCount: 10,
    medianTfrSec: 4000,
    isGap: true,
    ...overrides,
  };
}

const VENDOR_MAP = new Map([["v1", "Tiago"], ["v2", "Camila"]]);

describe("generateRecomendacoes", () => {
  it("retorna vazio quando nada esta ruim", () => {
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: 60,
      slaSec: 1800,
    });
    expect(result).toEqual([]);
  });

  it("recomenda redistribuicao quando vendedor tem 3+ cold leads", () => {
    const cold = [
      makeCold({ conversationId: "1", assignedTo: "v1" }),
      makeCold({ conversationId: "2", assignedTo: "v1" }),
      makeCold({ conversationId: "3", assignedTo: "v1" }),
    ];
    const result = generateRecomendacoes({
      coldLeads: cold,
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    const reco = result.find((r) => r.categoria === "redistribuicao");
    expect(reco).toBeDefined();
    expect(reco?.titulo).toContain("Tiago");
    expect(reco?.titulo).toContain("3");
    expect(reco?.nivel).toBe("urgente");
  });

  it("nao recomenda redistribuicao quando vendedor tem so 2 leads frios", () => {
    const cold = [
      makeCold({ conversationId: "1", assignedTo: "v1" }),
      makeCold({ conversationId: "2", assignedTo: "v1" }),
    ];
    const result = generateRecomendacoes({
      coldLeads: cold,
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    expect(result.find((r) => r.categoria === "redistribuicao")).toBeUndefined();
  });

  it("recomenda escalonamento quando worstGap TFR > 2x SLA", () => {
    const gap = makeGap({ medianTfrSec: 4000 });
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: gap,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    expect(result.find((r) => r.categoria === "escalonamento")).toBeDefined();
  });

  it("nao recomenda escalonamento quando worstGap TFR ainda eh aceitavel", () => {
    const gap = makeGap({ medianTfrSec: 2000 });
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: gap,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    expect(result.find((r) => r.categoria === "escalonamento")).toBeUndefined();
  });

  it("recomenda treinamento quando top objecao >= 20% das insights", () => {
    const objs: ObjecaoBucket[] = [
      { categoria: "preco", label: "Preco", count: 5, examples: ["caro"] },
    ];
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: objs,
      totalInsights: 20,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    const reco = result.find((r) => r.categoria === "treinamento");
    expect(reco).toBeDefined();
    expect(reco?.titulo).toContain("25%");
  });

  it("nao recomenda treinamento quando share <20%", () => {
    const objs: ObjecaoBucket[] = [
      { categoria: "preco", label: "Preco", count: 3, examples: ["caro"] },
    ];
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: objs,
      totalInsights: 100,
      tfrAvgSec: null,
      slaSec: 1800,
    });
    expect(result.find((r) => r.categoria === "treinamento")).toBeUndefined();
  });

  it("eleva nivel pra urgente quando TFR > 2x SLA", () => {
    const result = generateRecomendacoes({
      coldLeads: [],
      vendorNameById: VENDOR_MAP,
      worstGap: null,
      objections: [],
      totalInsights: 0,
      tfrAvgSec: 5400, // 90min > 60min (2x sla 30min)
      slaSec: 1800,
    });
    const reco = result.find((r) => r.categoria === "otimizacao");
    expect(reco?.nivel).toBe("urgente");
  });

  it("ordena urgentes antes de importantes e limita a 4", () => {
    const cold = Array.from({ length: 4 }, (_, i) =>
      makeCold({ conversationId: `c${i}`, assignedTo: "v1" }),
    );
    const moreCold = Array.from({ length: 5 }, (_, i) =>
      makeCold({ conversationId: `m${i}`, assignedTo: "v2" }),
    );
    const result = generateRecomendacoes({
      coldLeads: [...cold, ...moreCold],
      vendorNameById: VENDOR_MAP,
      worstGap: makeGap({ medianTfrSec: 5000 }),
      objections: [{ categoria: "preco", label: "Preco", count: 5, examples: ["caro"] }],
      totalInsights: 20,
      tfrAvgSec: 3600,
      slaSec: 1800,
    });
    expect(result.length).toBeLessThanOrEqual(4);
    const niveis = result.map((r) => r.nivel);
    const urgenteIdx = niveis.lastIndexOf("urgente");
    const importanteIdx = niveis.indexOf("importante");
    if (urgenteIdx !== -1 && importanteIdx !== -1) {
      expect(urgenteIdx).toBeLessThan(importanteIdx);
    }
  });
});
