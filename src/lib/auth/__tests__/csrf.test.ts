import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyCsrf } from "../csrf";
import { NextRequest } from "next/server";

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {}
): NextRequest {
  const url = `http://localhost:3000${path}`;
  return new NextRequest(url, { method, headers });
}

describe("verifyCsrf", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  it("permite GET requests sem validação", () => {
    const req = makeRequest("GET", "/api/whatsapp/conversations");
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite HEAD requests sem validação", () => {
    const req = makeRequest("HEAD", "/api/test");
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST em webhook paths", () => {
    const req = makeRequest("POST", "/api/webhooks/evolution/group", {
      origin: "https://evil.com",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST em cron paths", () => {
    const req = makeRequest("POST", "/api/cron/process-jobs", {
      origin: "https://evil.com",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST com Authorization header", () => {
    const req = makeRequest("POST", "/api/test", {
      authorization: "Bearer token123",
      origin: "https://evil.com",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST com upstash-signature", () => {
    const req = makeRequest("POST", "/api/social/publish", {
      "upstash-signature": "sig123",
      origin: "https://evil.com",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST sem Origin nem Referer (server-side fetch)", () => {
    const req = makeRequest("POST", "/api/test");
    expect(verifyCsrf(req)).toBeNull();
  });

  it("permite POST com Origin válido (localhost)", () => {
    const req = makeRequest("POST", "/api/test", {
      origin: "http://localhost:3000",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("bloqueia POST com Origin inválido", () => {
    const req = makeRequest("POST", "/api/test", {
      origin: "https://evil.com",
    });
    const result = verifyCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("permite POST com Referer válido quando Origin ausente", () => {
    const req = makeRequest("POST", "/api/test", {
      referer: "http://localhost:3000/dashboard",
    });
    expect(verifyCsrf(req)).toBeNull();
  });

  it("bloqueia POST com Referer inválido quando Origin ausente", () => {
    const req = makeRequest("POST", "/api/test", {
      referer: "https://evil.com/attack",
    });
    const result = verifyCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("bloqueia DELETE com Origin inválido", () => {
    const req = makeRequest("DELETE", "/api/test", {
      origin: "https://attacker.io",
    });
    const result = verifyCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
