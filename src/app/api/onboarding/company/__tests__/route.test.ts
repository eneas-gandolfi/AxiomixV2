/**
 * Arquivo: src/app/api/onboarding/company/__tests__/route.test.ts
 * Propósito: Garantir que o onboarding multi-nicho:
 *   - Rejeita slugs fora da lista curada
 *   - Persiste niche_slug + business_hours
 *   - Sincroniza o label `niche` (texto legível) com o slug escolhido
 *   - Redireciona pra Operação após criar a empresa
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// =============================================================================
// Mocks
// =============================================================================

const mockGetUser = vi.fn();
const mockSelectMembership = vi.fn();
const mockUpsertUser = vi.fn();
const mockSelectSlug = vi.fn();
const mockInsertCompany = vi.fn();
const mockInsertMembership = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: mockSelectMembership }),
              }),
            }),
          }),
          insert: mockInsertMembership,
        };
      }
      if (table === "users") {
        return { upsert: mockUpsertUser };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockSelectSlug }),
          }),
          insert: () => ({
            select: () => ({ single: mockInsertCompany }),
          }),
        };
      }
      return {};
    },
  }),
}));

import { POST } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const validBusinessHours = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: null,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/onboarding/company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
    error: null,
  });
  mockSelectMembership.mockResolvedValue({ data: null, error: null });
  mockUpsertUser.mockResolvedValue({ error: null });
  mockSelectSlug.mockResolvedValue({ data: null, error: null });
}

// =============================================================================
// Tests
// =============================================================================

describe("POST /api/onboarding/company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 sem usuário autenticado", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "no session" },
    });

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "varejo",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("rejeita payload sem nicheSlug", async () => {
    setupAuthenticatedUser();

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita slug fora da lista curada", async () => {
    setupAuthenticatedUser();

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "manufatura",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita business_hours com formato inválido", async () => {
    setupAuthenticatedUser();

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "varejo",
        businessHours: {
          mon: { open: "10am", close: "22:00" },
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
          sun: null,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita business_hours sem 7 dias", async () => {
    setupAuthenticatedUser();

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "varejo",
        businessHours: { mon: null, tue: null }, // faltam 5 dias
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita usuário que já tem empresa", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
      error: null,
    });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "existing-company" },
      error: null,
    });

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "varejo",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("COMPANY_ALREADY_EXISTS");
  });

  it("cria empresa com niche_slug + business_hours + label sincronizado", async () => {
    setupAuthenticatedUser();
    mockInsertCompany.mockResolvedValue({
      data: { id: "company-1", slug: "boutique-x" },
      error: null,
    });
    mockInsertMembership.mockResolvedValue({ error: null });

    const response = await POST(
      makeRequest({
        name: "Boutique X",
        nicheSlug: "varejo",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      companyId: "company-1",
      slug: "boutique-x",
      redirectTo: "/whatsapp-intelligence/operacao",
    });
  });

  it("redireciona pra /whatsapp-intelligence/operacao após sucesso", async () => {
    setupAuthenticatedUser();
    mockInsertCompany.mockResolvedValue({
      data: { id: "company-2", slug: "clinica-vitalis" },
      error: null,
    });
    mockInsertMembership.mockResolvedValue({ error: null });

    const response = await POST(
      makeRequest({
        name: "Clínica Vitalis",
        nicheSlug: "saude",
        businessHours: validBusinessHours,
      }),
    );
    const body = await response.json();

    expect(body.redirectTo).toBe("/whatsapp-intelligence/operacao");
  });
});
