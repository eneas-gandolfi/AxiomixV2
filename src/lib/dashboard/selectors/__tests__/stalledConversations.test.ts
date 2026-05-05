/**
 * Arquivo: src/lib/dashboard/selectors/__tests__/stalledConversations.test.ts
 * Propósito: Garantir que o número-herói do dashboard ("Conversas paradas")
 *            é espelho 1:1 do que a Operação reporta. Divergir entre as duas
 *            telas é um bug crítico de produto (Sally's red line).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/whatsapp/live-operation", () => ({
  getLiveOperationData: vi.fn(),
}));

import { selectStalledConversations } from "@/lib/dashboard/selectors/stalledConversations";
import { getLiveOperationData } from "@/lib/whatsapp/live-operation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";

const fakeSupabase = {} as SupabaseClient<Database>;
const COMPANY_ID = "company-1";

const baseThresholds = {
  amberSeconds: 600,
  redSeconds: 1200,
  nicheSlug: "varejo" as const,
};

function makeWaiting(
  conversationId: string,
  customerName: string,
  waitSeconds: number,
  severity: "ok" | "amber" | "red",
) {
  return {
    conversationId,
    customerName,
    customerPhone: null,
    customerAvatar: null,
    assigneeId: null,
    assigneeName: null,
    lastMessage: null,
    lastMessageType: null,
    lastInboundAt: new Date().toISOString(),
    waitSeconds,
    severity,
    pipelineStage: null,
    labels: [],
  };
}

describe("selectStalledConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna count=0 e items=[] quando ninguém está esperando (AC-F2.1 estado vazio)", async () => {
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten: null,
      inRiskQueue: [],
      operators: [],
      thresholds: baseThresholds,
      totalWaiting: 0,
      stalledCount: 0,
      isCurrentlyOpen: true,
      hasBusinessHours: false,
    });

    const result = await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(result.count).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.amberSeconds).toBe(600);
    expect(result.redSeconds).toBe(1200);
  });

  it("conta âmbar + vermelho mas exclui ok (AC-F2.1 1 stalled)", async () => {
    const mostForgotten = makeWaiting("c1", "Maria", 800, "amber");
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten,
      inRiskQueue: [],
      operators: [],
      thresholds: baseThresholds,
      totalWaiting: 3, // 1 âmbar + 2 ok
      stalledCount: 1,
      isCurrentlyOpen: true,
      hasBusinessHours: false,
    });

    const result = await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(result.count).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      conversationId: "c1",
      customerName: "Maria",
      waitSeconds: 800,
      severity: "amber",
    });
  });

  it("inclui mostForgotten + inRiskQueue nos items (AC-F2.1 N stalled)", async () => {
    const mostForgotten = makeWaiting("c1", "Maria", 1500, "red");
    const queue = [
      makeWaiting("c2", "João", 900, "amber"),
      makeWaiting("c3", "Ana", 750, "amber"),
    ];
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten,
      inRiskQueue: queue,
      operators: [],
      thresholds: baseThresholds,
      totalWaiting: 5,
      stalledCount: 3,
      isCurrentlyOpen: true,
      hasBusinessHours: false,
    });

    const result = await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(result.count).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.items.map((i) => i.conversationId)).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
    expect(result.items[0].severity).toBe("red");
  });

  it("exclui mostForgotten dos items quando severity é 'ok' (não tá parado)", async () => {
    // Caso edge: ninguém está em risco mas existe um mostForgotten ok (cliente
    // respondido recentemente). Não pode contar nem aparecer nos items.
    const mostForgotten = makeWaiting("c1", "Maria", 120, "ok");
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten,
      inRiskQueue: [],
      operators: [],
      thresholds: baseThresholds,
      totalWaiting: 1,
      stalledCount: 0,
      isCurrentlyOpen: true,
      hasBusinessHours: false,
    });

    const result = await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(result.count).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("propaga thresholds do nicho saúde (timezone-safe / niche-aware AC-F2.2)", async () => {
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten: null,
      inRiskQueue: [],
      operators: [],
      thresholds: {
        amberSeconds: 1800, // 30min
        redSeconds: 7200, // 2h
        nicheSlug: "saude",
      },
      totalWaiting: 0,
      stalledCount: 0,
      isCurrentlyOpen: true,
      hasBusinessHours: true,
    });

    const result = await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(result.amberSeconds).toBe(1800);
    expect(result.redSeconds).toBe(7200);
  });

  it("delega tudo pra getLiveOperationData (espelho 1:1 com Operação)", async () => {
    vi.mocked(getLiveOperationData).mockResolvedValue({
      mostForgotten: null,
      inRiskQueue: [],
      operators: [],
      thresholds: baseThresholds,
      totalWaiting: 0,
      stalledCount: 0,
      isCurrentlyOpen: true,
      hasBusinessHours: false,
    });

    await selectStalledConversations(fakeSupabase, COMPANY_ID);

    expect(getLiveOperationData).toHaveBeenCalledWith(fakeSupabase, COMPANY_ID);
    expect(getLiveOperationData).toHaveBeenCalledTimes(1);
  });
});
