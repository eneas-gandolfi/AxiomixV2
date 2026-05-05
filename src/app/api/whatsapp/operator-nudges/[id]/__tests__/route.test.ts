/**
 * Arquivo: src/app/api/whatsapp/operator-nudges/[id]/__tests__/route.test.ts
 * Propósito: Garante o contrato do PATCH individual:
 *   - 401 sem auth
 *   - 404 quando RLS bloqueia (nudge não pertence ao usuário)
 *   - 200 com read_at preenchido em sucesso
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockUpdateNudge = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: mockUpdateNudge }),
        }),
      }),
    }),
  }),
}));

import { PATCH } from "../route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/whatsapp/operator-nudges/abc", {
    method: "PATCH",
  });
}

const params = Promise.resolve({ id: "abc-123" });

describe("PATCH /api/whatsapp/operator-nudges/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 sem auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "no" } });

    const response = await PATCH(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("retorna 404 quando RLS bloqueia ou nudge não existe", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpdateNudge.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("marca como lida com sucesso e retorna read_at", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpdateNudge.mockResolvedValue({
      data: { id: "abc-123", read_at: "2026-05-07T15:30:00Z" },
      error: null,
    });

    const response = await PATCH(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.nudge.read_at).toBe("2026-05-07T15:30:00Z");
  });

  it("retorna 500 quando o banco falha", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpdateNudge.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    const response = await PATCH(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("UPDATE_ERROR");
  });
});
