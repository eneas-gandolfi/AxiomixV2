/**
 * Arquivo: src/lib/whatsapp/__tests__/pulso-comercial.test.ts
 * Proposito: Validar os helpers do Pulso Comercial — computeWaitingLeads
 *            (leads novos sem 1a resposta) e computeTfrStats (TFR em janela).
 */

import { describe, it, expect } from "vitest";
import {
  computeWaitingLeads,
  computeTfrStats,
  formatTfrDuration,
  type ConversationLight,
  type MessageLight,
} from "@/lib/whatsapp/pulso-comercial";

const NOW = new Date("2026-05-11T15:00:00.000Z");

function makeConv(overrides: Partial<ConversationLight> & { id: string }): ConversationLight {
  return {
    contactName: "Lead Teste",
    assignedTo: null,
    lastMessageAt: NOW.toISOString(),
    ...overrides,
  };
}

function msg(conversationId: string, direction: string, minutesAgo: number): MessageLight {
  return {
    conversationId,
    direction,
    sentAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
  };
}

describe("computeWaitingLeads", () => {
  it("detecta lead que enviou inbound 30min atras e ninguem respondeu", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [msg("c1", "inbound", 30)];

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.count).toBe(1);
    expect(result.leads[0].conversationId).toBe("c1");
    expect(result.leads[0].waitSeconds).toBe(1800);
    expect(result.oldestWaitSeconds).toBe(1800);
  });

  it("ignora lead com outbound posterior (ja foi respondido)", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [
      msg("c1", "inbound", 30),
      msg("c1", "outbound", 20),
    ];

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.count).toBe(0);
  });

  it("ordena leads do mais antigo (mais critico) para o mais recente", () => {
    const conversations = [
      makeConv({ id: "c-15min" }),
      makeConv({ id: "c-2h" }),
      makeConv({ id: "c-45min" }),
    ];
    const messages = [
      msg("c-15min", "inbound", 15),
      msg("c-2h", "inbound", 120),
      msg("c-45min", "inbound", 45),
    ];

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.leads.map((l) => l.conversationId)).toEqual(["c-2h", "c-45min", "c-15min"]);
    expect(result.oldestWaitSeconds).toBe(7200);
  });

  it("descarta inbound fora da janela recente (default 24h)", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [msg("c1", "inbound", 26 * 60)]; // 26h atras

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.count).toBe(0);
  });

  it("aceita window customizada", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [msg("c1", "inbound", 26 * 60)];

    const result = computeWaitingLeads(conversations, messages, NOW, 48 * 60 * 60 * 1000);
    expect(result.count).toBe(1);
  });

  it("ignora conversa sem nenhuma mensagem inbound", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [msg("c1", "outbound", 10)];

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.count).toBe(0);
  });

  it("trata direction legado 'in' como inbound", () => {
    const conversations = [makeConv({ id: "c1" })];
    const messages = [{ conversationId: "c1", direction: "in", sentAt: msg("c1", "inbound", 20).sentAt }];

    const result = computeWaitingLeads(conversations, messages, NOW);
    expect(result.count).toBe(1);
  });
});

describe("computeTfrStats", () => {
  const windowStart = new Date(NOW.getTime() - 6 * 60 * 60 * 1000); // 6h atras
  const windowEnd = NOW;

  it("retorna sampleSize 0 quando nao ha mensagens", () => {
    const result = computeTfrStats([], windowStart, windowEnd);
    expect(result).toEqual({
      sampleSize: 0,
      avgSeconds: null,
      medianSeconds: null,
      withinSlaPct: null,
    });
  });

  it("calcula TFR de uma unica conversa (inbound 60min, resposta 50min)", () => {
    const messages = [msg("c1", "inbound", 60), msg("c1", "outbound", 50)];
    const result = computeTfrStats(messages, windowStart, windowEnd);
    expect(result.sampleSize).toBe(1);
    expect(result.avgSeconds).toBe(600); // 10 min
    expect(result.medianSeconds).toBe(600);
    expect(result.withinSlaPct).toBe(100);
  });

  it("calcula media e mediana com varias conversas", () => {
    const messages = [
      msg("c1", "inbound", 60), msg("c1", "outbound", 50), // 10min
      msg("c2", "inbound", 120), msg("c2", "outbound", 119), // 1min
      msg("c3", "inbound", 180), msg("c3", "outbound", 90), // 90min
    ];
    const result = computeTfrStats(messages, new Date(NOW.getTime() - 4 * 60 * 60 * 1000), NOW);
    expect(result.sampleSize).toBe(3);
    expect(result.avgSeconds).toBeCloseTo((600 + 60 + 5400) / 3, 0);
    expect(result.medianSeconds).toBe(600);
  });

  it("conta TFRs dentro do SLA (default 30min)", () => {
    const messages = [
      msg("c1", "inbound", 60), msg("c1", "outbound", 59), // 1min dentro
      msg("c2", "inbound", 120), msg("c2", "outbound", 60), // 60min fora
    ];
    const result = computeTfrStats(messages, new Date(NOW.getTime() - 4 * 60 * 60 * 1000), NOW);
    expect(result.withinSlaPct).toBe(50);
  });

  it("ignora conversa cuja 1a inbound caiu fora da janela", () => {
    const messages = [msg("c1", "inbound", 8 * 60), msg("c1", "outbound", 7 * 60)];
    const result = computeTfrStats(messages, windowStart, windowEnd);
    expect(result.sampleSize).toBe(0);
  });

  it("ignora resposta anterior ao inbound (ordem caotica)", () => {
    const messages = [msg("c1", "outbound", 60), msg("c1", "inbound", 30)];
    const result = computeTfrStats(messages, windowStart, windowEnd);
    expect(result.sampleSize).toBe(0);
  });

  it("usa SLA customizado", () => {
    const messages = [msg("c1", "inbound", 30), msg("c1", "outbound", 28)]; // 2min
    const result = computeTfrStats(messages, windowStart, windowEnd, 60); // SLA 60s
    expect(result.withinSlaPct).toBe(0);
  });
});

describe("formatTfrDuration", () => {
  it("formata segundos abaixo de 60", () => {
    expect(formatTfrDuration(45)).toBe("45s");
  });
  it("formata minutos puros", () => {
    expect(formatTfrDuration(60 * 8)).toBe("8m");
  });
  it("formata horas + minutos", () => {
    expect(formatTfrDuration(3600 + 60 * 24)).toBe("1h24");
  });
  it("formata horas puras", () => {
    expect(formatTfrDuration(3600 * 2)).toBe("2h");
  });
  it("retorna em-dash para null", () => {
    expect(formatTfrDuration(null)).toBe("—");
  });
});
