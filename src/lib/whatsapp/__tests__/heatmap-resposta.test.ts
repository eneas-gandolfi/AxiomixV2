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
});
