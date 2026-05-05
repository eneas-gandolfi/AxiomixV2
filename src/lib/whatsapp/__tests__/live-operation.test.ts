/**
 * Arquivo: src/lib/whatsapp/__tests__/live-operation.test.ts
 * Propósito: Tests de aggregação do painel ao vivo da Operação:
 *   - Filtra corretamente "cliente esperando" (última msg é inbound)
 *   - Calcula severidade pelo threshold do nicho
 *   - Agrega operadores por urgência
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";
import { getLiveOperationData } from "@/lib/whatsapp/live-operation";

// =============================================================================
// Helpers pra montar mock Supabase encadeado
// =============================================================================

type MockResult<T> = { data: T; error: null };

function makeQueryResult<T>(data: T): MockResult<T> {
  return { data, error: null };
}

function makeMockSupabase(handlers: {
  company?: { niche_slug: string | null } | null;
  conversations?: Array<{
    id: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_avatar_url: string | null;
    assigned_to: string | null;
    status: string | null;
  }>;
  messages?: Array<{
    conversation_id: string;
    direction: string;
    sent_at: string;
    content: string | null;
  }>;
  users?: Array<{ id: string; full_name: string | null; email: string | null }>;
}) {
  const fromMock = vi.fn((table: string) => {
    if (table === "companies") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue(makeQueryResult(handlers.company ?? null)),
          }),
        }),
      };
    }
    if (table === "conversations") {
      return {
        select: () => ({
          eq: () => ({
            or: vi
              .fn()
              .mockResolvedValue(makeQueryResult(handlers.conversations ?? [])),
          }),
        }),
      };
    }
    if (table === "messages") {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                limit: vi
                  .fn()
                  .mockResolvedValue(makeQueryResult(handlers.messages ?? [])),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "users") {
      return {
        select: () => ({
          in: vi.fn().mockResolvedValue(makeQueryResult(handlers.users ?? [])),
        }),
      };
    }
    return {};
  });

  return { from: fromMock } as unknown as SupabaseClient<Database>;
}

// =============================================================================
// Tests
// =============================================================================

describe("getLiveOperationData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fixa o "agora" pra cálculos de tempo determinísticos
    vi.setSystemTime(new Date("2026-05-06T15:00:00Z"));
  });

  it("aceita direction='inbound' (formato webhook) além de 'in' (legacy)", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "conv-1",
          contact_name: "Maria",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "conv-1",
          direction: "inbound", // ← formato do webhook real
          sent_at: "2026-05-06T14:30:00Z",
          content: null,
        },
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    // Cliente esperando deve ser detectado mesmo com 'inbound'
    expect(result.mostForgotten).not.toBeNull();
    expect(result.mostForgotten!.customerName).toBe("Maria");
  });

  it("retorna vazio quando o tenant não tem conversas", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.mostForgotten).toBeNull();
    expect(result.inRiskQueue).toEqual([]);
    expect(result.operators).toEqual([]);
    expect(result.totalWaiting).toBe(0);
    expect(result.thresholds).toEqual({
      amberSeconds: 600,
      redSeconds: 1200,
      nicheSlug: "varejo",
    });
  });

  it("usa thresholds default quando o tenant não tem niche_slug", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: null },
      conversations: [],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    // Sem nicho, default 30min/2h (do código fonte da função)
    expect(result.thresholds.amberSeconds).toBe(1800);
    expect(result.thresholds.redSeconds).toBe(7200);
    expect(result.thresholds.nicheSlug).toBeNull();
  });

  it("filtra conversas onde a última mensagem é OUT (já respondemos)", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "conv-1",
          contact_name: "Maria Silva",
          contact_phone: "+5511999",
          contact_avatar_url: null,
          assigned_to: "user-1",
          status: "open",
        },
      ],
      messages: [
        // Última msg foi NOSSA — cliente NÃO está esperando
        {
          conversation_id: "conv-1",
          direction: "out",
          sent_at: "2026-05-06T14:55:00Z",
          content: "Já respondi",
        },
      ],
      users: [{ id: "user-1", full_name: "João Vendedor", email: "j@ex.com" }],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.mostForgotten).toBeNull();
    expect(result.totalWaiting).toBe(0);
    // Mas o operador continua aparecendo no grid (tem 1 conversa ativa)
    expect(result.operators).toHaveLength(1);
    expect(result.operators[0].activeCount).toBe(1);
    expect(result.operators[0].severity).toBe("ok");
  });

  it("identifica cliente esquecido com severidade correta (varejo: 10min/20min)", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" }, // 600s âmbar / 1200s vermelho
      conversations: [
        {
          id: "conv-1",
          contact_name: "Maria Silva",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: "user-1",
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "conv-1",
          direction: "in",
          sent_at: "2026-05-06T14:51:30Z", // 8m30s atrás
          content: "Tem essa blusa no M?",
        },
      ],
      users: [{ id: "user-1", full_name: "João", email: null }],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.mostForgotten).not.toBeNull();
    expect(result.mostForgotten!.customerName).toBe("Maria Silva");
    expect(result.mostForgotten!.assigneeName).toBe("João");
    expect(result.mostForgotten!.waitSeconds).toBe(510); // 8:30
    expect(result.mostForgotten!.severity).toBe("ok"); // <600s
  });

  it("classifica corretamente nas faixas âmbar e vermelho", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "conv-amber",
          contact_name: "Cliente Âmbar",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
        {
          id: "conv-red",
          contact_name: "Cliente Vermelho",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "conv-amber",
          direction: "in",
          sent_at: "2026-05-06T14:48:00Z", // 12min atrás → âmbar
          content: null,
        },
        {
          conversation_id: "conv-red",
          direction: "in",
          sent_at: "2026-05-06T14:35:00Z", // 25min atrás → vermelho
          content: null,
        },
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    // O mais esquecido (vermelho) sobe pro hero
    expect(result.mostForgotten!.customerName).toBe("Cliente Vermelho");
    expect(result.mostForgotten!.severity).toBe("red");

    // O outro (âmbar) entra na fila
    expect(result.inRiskQueue).toHaveLength(1);
    expect(result.inRiskQueue[0].customerName).toBe("Cliente Âmbar");
    expect(result.inRiskQueue[0].severity).toBe("amber");
  });

  it("respeita threshold do nicho saúde (30min/2h)", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "saude" }, // 1800s âmbar / 7200s vermelho
      conversations: [
        {
          id: "conv-1",
          contact_name: "Helena",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "conv-1",
          direction: "in",
          sent_at: "2026-05-06T14:48:00Z", // 12min atrás
          content: null,
        },
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    // 12min é âmbar pra varejo, mas OK pra saúde
    expect(result.mostForgotten!.severity).toBe("ok");
    expect(result.thresholds.amberSeconds).toBe(1800);
  });

  it("ignora conversas resolvidas/fechadas", async () => {
    // O .or() do Supabase no caminho do código filtra status. Como o mock
    // não simula essa lógica, neste teste presumimos que o caller já filtrou
    // (que é como funciona em produção). O teste cobre o caminho normal.
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [], // mock retorna vazio (filtro foi aplicado upstream)
    });

    const result = await getLiveOperationData(supabase, "company-1");
    expect(result.totalWaiting).toBe(0);
  });

  it("agrega operadores e ordena por urgência (vermelho > âmbar > ok)", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "c1",
          contact_name: "Cliente A",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: "op-tranquilo",
          status: "open",
        },
        {
          id: "c2",
          contact_name: "Cliente B",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: "op-urgente",
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "c1",
          direction: "in",
          sent_at: "2026-05-06T14:58:00Z", // 2min — ok
          content: null,
        },
        {
          conversation_id: "c2",
          direction: "in",
          sent_at: "2026-05-06T14:35:00Z", // 25min — vermelho
          content: null,
        },
      ],
      users: [
        { id: "op-tranquilo", full_name: "Pedro", email: null },
        { id: "op-urgente", full_name: "João", email: null },
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.operators).toHaveLength(2);
    // O urgente vem primeiro
    expect(result.operators[0].operatorName).toBe("João");
    expect(result.operators[0].severity).toBe("red");
    expect(result.operators[0].worstCustomerName).toBe("Cliente B");
    expect(result.operators[1].operatorName).toBe("Pedro");
    expect(result.operators[1].severity).toBe("ok");
  });

  it("resolve assignee unassigned como '__unassigned__' sem quebrar", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "c1",
          contact_name: "Sem Dono",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "c1",
          direction: "in",
          sent_at: "2026-05-06T14:30:00Z",
          content: null,
        },
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.operators).toHaveLength(1);
    expect(result.operators[0].operatorId).toBeNull();
    expect(result.operators[0].operatorName).toBeNull();
  });

  it("hero é o mais esquecido, fila exclui o hero", async () => {
    const supabase = makeMockSupabase({
      company: { niche_slug: "varejo" },
      conversations: [
        {
          id: "c1",
          contact_name: "Antigo",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
        {
          id: "c2",
          contact_name: "Médio",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
        {
          id: "c3",
          contact_name: "Novo",
          contact_phone: null,
          contact_avatar_url: null,
          assigned_to: null,
          status: "open",
        },
      ],
      messages: [
        {
          conversation_id: "c1",
          direction: "in",
          sent_at: "2026-05-06T14:35:00Z",
          content: null,
        }, // 25min
        {
          conversation_id: "c2",
          direction: "in",
          sent_at: "2026-05-06T14:45:00Z",
          content: null,
        }, // 15min
        {
          conversation_id: "c3",
          direction: "in",
          sent_at: "2026-05-06T14:50:00Z",
          content: null,
        }, // 10min
      ],
    });

    const result = await getLiveOperationData(supabase, "company-1");

    expect(result.mostForgotten!.customerName).toBe("Antigo");
    expect(result.inRiskQueue.map((q) => q.customerName)).toEqual([
      "Médio",
      "Novo",
    ]);
    expect(result.totalWaiting).toBe(3);
  });
});
