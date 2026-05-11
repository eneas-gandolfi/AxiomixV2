/**
 * Arquivo: src/lib/whatsapp/__tests__/cold-leads.test.ts
 * Proposito: Validar o detector de leads esfriados — heuristica de motivo
 *            (vendedor_nao_respondeu | lead_silenciou | sem_followup), corte
 *            por dias calendario em America/Sao_Paulo, ordenacao por urgencia,
 *            e tolerancia aos formatos legados de direction ('in'/'out' alem
 *            de 'inbound'/'outbound').
 */

import { describe, it, expect } from "vitest";
import {
  detectColdLeads,
  type ConversationRow,
  type LastMessageRow,
} from "@/lib/whatsapp/cold-leads";

function isoDaysAgoInSP(reference: Date, days: number): string {
  // 12:00 local em SP no dia D-days, expresso em UTC (SP eh UTC-3 sem DST hoje).
  // 12:00 SP = 15:00 UTC.
  const target = new Date(reference.getTime());
  target.setUTCDate(target.getUTCDate() - days);
  target.setUTCHours(15, 0, 0, 0);
  return target.toISOString();
}

function makeConv(
  overrides: Partial<ConversationRow> & { id: string },
): ConversationRow {
  return {
    contactName: "Lead Teste",
    contactPhone: "+5511999999999",
    assignedTo: null,
    lastMessageAt: null,
    ...overrides,
  };
}

function makeLastMessages(
  entries: Array<{ conversationId: string; direction: string; sentAt: string }>,
): Map<string, LastMessageRow> {
  return new Map(entries.map((e) => [e.conversationId, e]));
}

const NOW = new Date("2026-05-11T15:00:00.000Z");

describe("detectColdLeads", () => {
  it("retorna vazio quando todas as conversas tem resposta recente (< 3 dias)", () => {
    const convs = [
      makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 1) }),
      makeConv({ id: "c2", lastMessageAt: isoDaysAgoInSP(NOW, 2) }),
    ];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 1) },
      { conversationId: "c2", direction: "outbound", sentAt: isoDaysAgoInSP(NOW, 2) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toEqual([]);
  });

  it("classifica como vendedor_nao_respondeu quando lead foi ultimo a falar ha >=3d", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 5) })];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 5) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      conversationId: "c1",
      motivo: "vendedor_nao_respondeu",
      lastSender: "lead",
      diasSemResposta: 5,
    });
  });

  it("classifica como lead_silenciou quando vendedor falou por ultimo ha >=7d", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 8) })];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "outbound", sentAt: isoDaysAgoInSP(NOW, 8) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].motivo).toBe("lead_silenciou");
    expect(result[0].lastSender).toBe("vendedor");
  });

  it("nao classifica vendedor que respondeu ha 5d como lead_silenciou (limite 7d)", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 5) })];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "outbound", sentAt: isoDaysAgoInSP(NOW, 5) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toEqual([]);
  });

  it("usa sem_followup como catch-all quando direction nao conhecido e dias >=14", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 16) })];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "unknown_format", sentAt: isoDaysAgoInSP(NOW, 16) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].motivo).toBe("sem_followup");
    expect(result[0].lastSender).toBe("desconhecido");
  });

  it("aceita formatos legados de direction ('in' e 'out')", () => {
    const convs = [
      makeConv({ id: "leg-in", lastMessageAt: isoDaysAgoInSP(NOW, 4) }),
      makeConv({ id: "leg-out", lastMessageAt: isoDaysAgoInSP(NOW, 9) }),
    ];
    const lastMessages = makeLastMessages([
      { conversationId: "leg-in", direction: "in", sentAt: isoDaysAgoInSP(NOW, 4) },
      { conversationId: "leg-out", direction: "out", sentAt: isoDaysAgoInSP(NOW, 9) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    const byId = new Map(result.map((r) => [r.conversationId, r]));
    expect(byId.get("leg-in")?.motivo).toBe("vendedor_nao_respondeu");
    expect(byId.get("leg-out")?.motivo).toBe("lead_silenciou");
  });

  it("ordena por diasSemResposta decrescente (mais critico primeiro)", () => {
    const convs = [
      makeConv({ id: "c-3d", lastMessageAt: isoDaysAgoInSP(NOW, 3) }),
      makeConv({ id: "c-11d", lastMessageAt: isoDaysAgoInSP(NOW, 11) }),
      makeConv({ id: "c-7d", lastMessageAt: isoDaysAgoInSP(NOW, 7) }),
    ];
    const lastMessages = makeLastMessages([
      { conversationId: "c-3d", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 3) },
      { conversationId: "c-11d", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 11) },
      { conversationId: "c-7d", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 7) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result.map((r) => r.conversationId)).toEqual(["c-11d", "c-7d", "c-3d"]);
  });

  it("ignora conversas sem lastMessageAt", () => {
    const convs = [
      makeConv({ id: "sem-data", lastMessageAt: null }),
      makeConv({ id: "valida", lastMessageAt: isoDaysAgoInSP(NOW, 4) }),
    ];
    const lastMessages = makeLastMessages([
      { conversationId: "valida", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 4) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].conversationId).toBe("valida");
  });

  it("respeita dia calendario em America/Sao_Paulo (mensagem 23h45 SP conta como ontem)", () => {
    // 2026-05-11 00:00:00 UTC = 2026-05-10 21:00 SP (UTC-3).
    // now = 2026-05-11 21:00 SP. mensagem em 2026-05-08 23:45 SP = 2026-05-09T02:45Z.
    // diff em dias calendario SP entre 2026-05-08 e 2026-05-11 = 3 dias.
    const nowSp = new Date("2026-05-12T00:00:00.000Z"); // 2026-05-11 21:00 SP
    const msgSp = "2026-05-09T02:45:00.000Z"; // 2026-05-08 23:45 SP

    const convs = [makeConv({ id: "tz", lastMessageAt: msgSp })];
    const lastMessages = makeLastMessages([
      { conversationId: "tz", direction: "inbound", sentAt: msgSp },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: nowSp });
    expect(result).toHaveLength(1);
    expect(result[0].diasSemResposta).toBe(3);
  });

  it("trata contactName vazio com fallback 'Lead sem nome'", () => {
    const convs = [
      makeConv({ id: "c1", contactName: "   ", lastMessageAt: isoDaysAgoInSP(NOW, 4) }),
    ];
    const lastMessages = makeLastMessages([
      { conversationId: "c1", direction: "inbound", sentAt: isoDaysAgoInSP(NOW, 4) },
    ]);

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result[0].contactName).toBe("Lead sem nome");
  });

  it("nao retorna conversation sem last message quando dias < 14 (catch-all so dispara >=14d)", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 9) })];
    const lastMessages = new Map<string, LastMessageRow>(); // sem mensagens conhecidas

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toEqual([]);
  });

  it("retorna conversation sem last message quando dias >= 14 como sem_followup", () => {
    const convs = [makeConv({ id: "c1", lastMessageAt: isoDaysAgoInSP(NOW, 20) })];
    const lastMessages = new Map<string, LastMessageRow>();

    const result = detectColdLeads({ conversations: convs, lastMessages, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].motivo).toBe("sem_followup");
    expect(result[0].lastSender).toBe("desconhecido");
  });
});
