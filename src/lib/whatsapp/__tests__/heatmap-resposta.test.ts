/**
 * Arquivo: src/lib/whatsapp/__tests__/heatmap-resposta.test.ts
 * Proposito: Validar contagem por celula (dia, hora) em SP, TFR mediano e
 *            deteccao de "gap" quando TFR mediano excede SLA.
 */

import { describe, it, expect } from "vitest";
import { computeResponseHeatmap } from "@/lib/whatsapp/heatmap-resposta";
import type { MessageLight } from "@/lib/whatsapp/pulso-comercial";

// 2026-05-11 (segunda) 13:00 UTC = 10:00 SP — terca em zona UTC vira segunda?
// 2026-05-11 eh segunda. 13:00 UTC nessa data = 10:00 SP segunda.
const SEG_10H_SP_INBOUND = "2026-05-11T13:00:00.000Z";
const SEG_10H_05_SP_OUTBOUND = "2026-05-11T13:05:00.000Z"; // 5min TFR
const SEG_11H_SP_INBOUND = "2026-05-11T14:00:00.000Z";
const SEG_11H_SP_OUTBOUND_1H = "2026-05-11T15:00:00.000Z"; // 1h depois de 10h SP

describe("computeResponseHeatmap", () => {
  it("ignora mensagens sem inbound", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "outbound", sentAt: SEG_10H_SP_INBOUND },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    expect(result.cells.every((c) => c.inboundCount === 0)).toBe(true);
    expect(result.peakCell).toBeNull();
  });

  it("conta inbound na celula correta em SP (seg 10h)", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    const cell = result.cells.find((c) => c.day === "mon" && c.hour === 10)!;
    expect(cell.inboundCount).toBe(1);
    expect(result.peakCell?.day).toBe("mon");
    expect(result.peakCell?.hour).toBe(10);
  });

  it("calcula TFR mediano quando ha outbound posterior", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
      { conversationId: "c1", direction: "outbound", sentAt: SEG_10H_05_SP_OUTBOUND },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    const cell = result.cells.find((c) => c.day === "mon" && c.hour === 10)!;
    expect(cell.medianTfrSec).toBe(300); // 5min
    expect(cell.isGap).toBe(false);
  });

  it("marca celula como gap quando TFR mediano > SLA", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
      // outbound 2h depois (7200s > SLA 1800)
      { conversationId: "c1", direction: "outbound", sentAt: "2026-05-11T15:00:00.000Z" },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    const cell = result.cells.find((c) => c.day === "mon" && c.hour === 10)!;
    expect(cell.isGap).toBe(true);
    expect(result.worstGap?.day).toBe("mon");
  });

  it("marca como gap quando inbound chegou mas nunca houve resposta", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "inbound", sentAt: SEG_11H_SP_INBOUND },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    const cell = result.cells.find((c) => c.day === "mon" && c.hour === 11)!;
    expect(cell.inboundCount).toBe(1);
    expect(cell.medianTfrSec).toBeNull();
    expect(cell.isGap).toBe(true);
  });

  it("identifica peakCell pela maior quantidade de inbounds", () => {
    const messages: MessageLight[] = [
      { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
      { conversationId: "c2", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
      { conversationId: "c3", direction: "inbound", sentAt: SEG_11H_SP_INBOUND },
    ];
    const result = computeResponseHeatmap(messages, 1800);
    expect(result.peakCell?.day).toBe("mon");
    expect(result.peakCell?.hour).toBe(10);
    expect(result.peakCell?.inboundCount).toBe(2);
    expect(SEG_11H_SP_OUTBOUND_1H).toBeTruthy();
  });

  describe("options: bucketing, janela de horario e timezone", () => {
    it("agrupa 10h e 11h no mesmo bucket 2h (10-11h) com hourStart=8", () => {
      const messages: MessageLight[] = [
        { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
        { conversationId: "c2", direction: "inbound", sentAt: SEG_11H_SP_INBOUND },
      ];
      const result = computeResponseHeatmap(messages, 1800, {
        bucketSizeHours: 2,
        hourStart: 8,
        hourEnd: 22,
      });
      const cell = result.cells.find((c) => c.day === "mon" && c.hour === 10)!;
      expect(cell.inboundCount).toBe(2);
      // grid só tem buckets pares a partir de 8 (8, 10, ..., 20)
      const hours = Array.from(new Set(result.cells.map((c) => c.hour)));
      expect(hours).toEqual([8, 10, 12, 14, 16, 18, 20]);
    });

    it("mediana agregada por bucket (nunca mediana de medianas)", () => {
      // 3 conversas no mesmo bucket 10-11h: TFRs 60s (10h), 300s (10h), 3600s (11h)
      const messages: MessageLight[] = [
        { conversationId: "a", direction: "inbound", sentAt: "2026-05-11T13:00:00.000Z" },
        { conversationId: "a", direction: "outbound", sentAt: "2026-05-11T13:01:00.000Z" },
        { conversationId: "b", direction: "inbound", sentAt: "2026-05-11T13:10:00.000Z" },
        { conversationId: "b", direction: "outbound", sentAt: "2026-05-11T13:15:00.000Z" },
        { conversationId: "c", direction: "inbound", sentAt: "2026-05-11T14:00:00.000Z" },
        { conversationId: "c", direction: "outbound", sentAt: "2026-05-11T15:00:00.000Z" },
      ];
      const result = computeResponseHeatmap(messages, 1800, {
        bucketSizeHours: 2,
        hourStart: 8,
        hourEnd: 22,
      });
      const cell = result.cells.find((c) => c.day === "mon" && c.hour === 10)!;
      // mediana de [60, 300, 3600] = 300. (Mediana de medianas por hora seria
      // mediana de [180, 3600] = 1890 — errado.)
      expect(cell.medianTfrSec).toBe(300);
      expect(cell.isGap).toBe(false);
    });

    it("descarta inbounds fora da janela [hourStart, hourEnd)", () => {
      // 02:00 SP (05:00 UTC) — fora da janela 8-22h
      const messages: MessageLight[] = [
        { conversationId: "c1", direction: "inbound", sentAt: "2026-05-11T05:00:00.000Z" },
      ];
      const result = computeResponseHeatmap(messages, 1800, {
        hourStart: 8,
        hourEnd: 22,
      });
      expect(result.cells.every((c) => c.inboundCount === 0)).toBe(true);
      expect(result.peakCell).toBeNull();
    });

    it("respeita timezone customizado", () => {
      // 13:00 UTC = 10:00 SP, mas 13:00 em UTC puro
      const messages: MessageLight[] = [
        { conversationId: "c1", direction: "inbound", sentAt: SEG_10H_SP_INBOUND },
      ];
      const result = computeResponseHeatmap(messages, 1800, { timezone: "UTC" });
      const cell = result.cells.find((c) => c.day === "mon" && c.hour === 13)!;
      expect(cell.inboundCount).toBe(1);
    });
  });
});
