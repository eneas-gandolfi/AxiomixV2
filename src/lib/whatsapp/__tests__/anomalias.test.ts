/**
 * Testa a deteccao de anomalias vs baseline proprio (janela 7d vs 21d).
 */

import { describe, it, expect } from "vitest";
import { detectAnomalias, type InsightLight } from "@/lib/whatsapp/anomalias";
import type { MessageLight } from "@/lib/whatsapp/pulso-comercial";

const NOW = new Date("2026-07-27T12:00:00.000Z");
const DAY_MS = 86_400_000;

function iso(daysAgo: number, offsetMinutes = 0): string {
  return new Date(NOW.getTime() - daysAgo * DAY_MS + offsetMinutes * 60_000).toISOString();
}

/** Gera um par inbound→outbound com TFR controlado, numa conversa única. */
function pair(convId: string, daysAgo: number, tfrMinutes: number): MessageLight[] {
  return [
    { conversationId: convId, direction: "inbound", sentAt: iso(daysAgo) },
    { conversationId: convId, direction: "outbound", sentAt: iso(daysAgo, tfrMinutes) },
  ];
}

describe("detectAnomalias", () => {
  it("detecta piora critica de TFR (atual 3x o baseline)", () => {
    const messages: MessageLight[] = [];
    // Baseline (dias 8-28): 12 conversas com TFR 10min
    for (let i = 0; i < 12; i++) messages.push(...pair(`b${i}`, 9 + i, 10));
    // Janela atual (últimos 7d): 12 conversas com TFR 30min
    for (let i = 0; i < 12; i++) messages.push(...pair(`a${i}`, (i % 6) + 0.5, 30));

    const result = detectAnomalias({ messages, insights: [], now: NOW });
    const tfr = result.find((a) => a.metrica === "tfr");
    expect(tfr).toBeDefined();
    expect(tfr!.direcao).toBe("piora");
    expect(tfr!.severidade).toBe("critica");
    expect(tfr!.deltaPct).toBeGreaterThanOrEqual(80);
  });

  it("detecta piora de sentimento negativo (10% → 50%)", () => {
    const insights: InsightLight[] = [];
    // Baseline: 20 insights, 2 negativos (10%)
    for (let i = 0; i < 20; i++) {
      insights.push({ sentiment: i < 2 ? "negativo" : "positivo", generatedAt: iso(10 + (i % 15)) });
    }
    // Atual: 10 insights, 5 negativos (50%)
    for (let i = 0; i < 10; i++) {
      insights.push({ sentiment: i < 5 ? "negativo" : "neutro", generatedAt: iso((i % 6) + 0.5) });
    }

    const result = detectAnomalias({ messages: [], insights, now: NOW });
    const sent = result.find((a) => a.metrica === "sentimento_negativo");
    expect(sent).toBeDefined();
    expect(sent!.direcao).toBe("piora");
    expect(sent!.severidade).toBe("critica");
  });

  it("queda de volume inbound e piora; alta e melhora", () => {
    const queda: MessageLight[] = [];
    // Baseline: 30 inbounds em 21 dias (10/semana); atual: 3
    for (let i = 0; i < 30; i++) {
      queda.push({ conversationId: `q${i}`, direction: "inbound", sentAt: iso(8 + (i % 20)) });
    }
    for (let i = 0; i < 3; i++) {
      queda.push({ conversationId: `qa${i}`, direction: "inbound", sentAt: iso(i + 0.5) });
    }
    const resultQueda = detectAnomalias({ messages: queda, insights: [], now: NOW });
    const vol = resultQueda.find((a) => a.metrica === "volume_inbound");
    expect(vol).toBeDefined();
    expect(vol!.direcao).toBe("piora");

    const alta: MessageLight[] = [];
    for (let i = 0; i < 21; i++) {
      alta.push({ conversationId: `h${i}`, direction: "inbound", sentAt: iso(8 + (i % 20)) });
    }
    for (let i = 0; i < 20; i++) {
      alta.push({ conversationId: `ha${i}`, direction: "inbound", sentAt: iso((i % 6) + 0.5) });
    }
    const resultAlta = detectAnomalias({ messages: alta, insights: [], now: NOW });
    const volAlta = resultAlta.find((a) => a.metrica === "volume_inbound");
    expect(volAlta).toBeDefined();
    expect(volAlta!.direcao).toBe("melhora");
  });

  it("amostra insuficiente nao gera anomalia (evita alarme falso)", () => {
    const messages: MessageLight[] = [
      ...pair("a", 0.5, 60),
      ...pair("b", 9, 5),
    ];
    const insights: InsightLight[] = [
      { sentiment: "negativo", generatedAt: iso(0.5) },
      { sentiment: "positivo", generatedAt: iso(10) },
    ];
    const result = detectAnomalias({ messages, insights, now: NOW });
    expect(result.filter((a) => a.metrica !== "volume_inbound")).toEqual([]);
  });

  it("desvio abaixo de 40% nao vira anomalia", () => {
    const messages: MessageLight[] = [];
    for (let i = 0; i < 12; i++) messages.push(...pair(`b${i}`, 9 + i, 10));
    for (let i = 0; i < 12; i++) messages.push(...pair(`a${i}`, (i % 6) + 0.5, 12)); // +20%
    const result = detectAnomalias({ messages, insights: [], now: NOW });
    expect(result.find((a) => a.metrica === "tfr")).toBeUndefined();
  });
});
