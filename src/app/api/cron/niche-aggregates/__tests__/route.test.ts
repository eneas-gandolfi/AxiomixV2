/**
 * Arquivo: src/app/api/cron/niche-aggregates/__tests__/route.test.ts
 * Propósito: Garantir que o cron de agregação de nichos rejeita acesso
 *            não-autorizado e propaga o resultado do RPC corretamente.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRpc = vi.fn();
const mockIsCronAuthorized = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    rpc: mockRpc,
  }),
}));

vi.mock("@/lib/auth/cron-auth", () => ({
  isCronAuthorized: (request: NextRequest) => mockIsCronAuthorized(request),
}));

import { GET } from "../route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/niche-aggregates", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/cron/niche-aggregates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando o request não está autorizado", async () => {
    mockIsCronAuthorized.mockReturnValue(false);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("chama recompute_niche_aggregates quando autorizado", async () => {
    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockResolvedValue({ data: 3, error: null });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("recompute_niche_aggregates");
    expect(body).toMatchObject({
      ok: true,
      affectedNiches: 3,
    });
    expect(body.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("retorna affectedNiches=0 quando RPC retorna nulo", async () => {
    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockResolvedValue({ data: null, error: null });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.affectedNiches).toBe(0);
  });

  it("retorna 500 quando o RPC falha", async () => {
    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "function failed" },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("RECOMPUTE_ERROR");
  });

  it("não vaza dbCode/dbMessage em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");

    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "secret leak" },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.detail).toBeUndefined();

    vi.unstubAllEnvs();
  });

  it("expõe dbCode/dbMessage em desenvolvimento pra debug", async () => {
    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "detailed error" },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.detail).toMatchObject({
      dbCode: "P0001",
      dbMessage: "detailed error",
    });
  });

  it("captura exceção inesperada em rede/runtime", async () => {
    mockIsCronAuthorized.mockReturnValue(true);
    mockRpc.mockRejectedValue(new Error("network down"));

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("CRON_NICHE_AGGREGATES_ERROR");
    expect(body.error).toContain("network down");
  });
});
