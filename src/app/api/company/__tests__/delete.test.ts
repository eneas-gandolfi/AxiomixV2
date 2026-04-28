import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase clients
const mockGetUser = vi.fn();
const mockSelectMembership = vi.fn();
const mockSelectCompany = vi.fn();
const mockDeleteCompany = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteHandlerClient: () => ({
    auth: { getUser: mockGetUser },
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
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({ single: mockSelectCompany }),
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      delete: () => ({
        eq: mockDeleteCompany,
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { DELETE } from "../route";

function makeDeleteRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/company", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Test" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("returns 403 when user is not owner", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "c1", role: "admin" },
      error: null,
    });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Test" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 when company name doesn't match", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "c1", role: "owner" },
      error: null,
    });
    mockSelectCompany.mockResolvedValue({
      data: { name: "Minha Empresa" },
      error: null,
    });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Nome Errado" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("COMPANY_DELETE_CONFIRM_MISMATCH");
  });

  it("returns 200 and deletes company when owner confirms correctly", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "c1", role: "owner" },
      error: null,
    });
    mockSelectCompany.mockResolvedValue({
      data: { name: "Minha Empresa" },
      error: null,
    });
    mockDeleteCompany.mockResolvedValue({ error: null });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Minha Empresa" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(true);
  });

  it("returns 500 when delete fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "c1", role: "owner" },
      error: null,
    });
    mockSelectCompany.mockResolvedValue({
      data: { name: "Test Co" },
      error: null,
    });
    mockDeleteCompany.mockResolvedValue({ error: { message: "FK constraint" } });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Test Co" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("COMPANY_DELETE_ERROR");
  });

  it("never leaks error details in response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSelectMembership.mockResolvedValue({
      data: { company_id: "c1", role: "owner" },
      error: null,
    });
    mockSelectCompany.mockResolvedValue({
      data: { name: "Test" },
      error: null,
    });
    mockDeleteCompany.mockResolvedValue({ error: { message: "secret DB info" } });

    const response = await DELETE(makeDeleteRequest({ confirmName: "Test" }));
    const text = await response.text();

    expect(text).not.toContain("secret DB info");
  });
});
