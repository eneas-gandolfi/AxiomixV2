import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = {
  getClaims: vi.fn(),
  getUser: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: authMock,
  })),
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseEnv: () => ({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  }),
}));

describe("resolveSessionFromMiddleware", () => {
  beforeEach(() => {
    authMock.getClaims.mockReset();
    authMock.getUser.mockReset();
  });

  it("does not authenticate anonymous project claims without a user session", async () => {
    authMock.getClaims.mockResolvedValue({
      data: { claims: { sub: "anon", email: undefined, role: "anon" } },
      error: null,
    });
    authMock.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { resolveSessionFromMiddleware } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");

    const result = await resolveSessionFromMiddleware(request);

    expect(result.user).toBeNull();
  });

  it("returns the authenticated user from a valid session", async () => {
    authMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    });

    const { resolveSessionFromMiddleware } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");

    const result = await resolveSessionFromMiddleware(request);

    expect(result.user).toEqual({ id: "user-1", email: "user@example.com" });
  });
});
