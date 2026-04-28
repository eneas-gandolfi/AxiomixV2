import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { ZodError, ZodIssueCode } from "zod";
import { handleRouteError } from "../handle-route-error";

class FakeApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function makeRequest(requestId?: string): NextRequest {
  const headers = new Headers();
  if (requestId) headers.set("x-request-id", requestId);
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("handleRouteError", () => {
  it("handles ApiError (CompanyAccessError shape) with correct code and status", async () => {
    const error = new FakeApiError("Sem permissão", "FORBIDDEN", 403);

    const response = handleRouteError(error, "FALLBACK_ERROR");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Sem permissão");
    expect(body.code).toBe("FORBIDDEN");
  });

  it("handles ZodError with VALIDATION_ERROR code and status 400", async () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["companyId"],
        message: "companyId inválido.",
      },
    ]);

    const response = handleRouteError(zodError, "FALLBACK_ERROR");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("companyId inválido.");
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("handles unknown Error with fallback code and status 500", async () => {
    const error = new Error("something broke internally");

    const response = handleRouteError(error, "CAMPAIGN_ERROR");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Erro interno");
    expect(body.code).toBe("CAMPAIGN_ERROR");
  });

  it("handles non-Error values with fallback code and status 500", async () => {
    const response = handleRouteError("string error", "UNKNOWN_ERROR");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Erro interno");
    expect(body.code).toBe("UNKNOWN_ERROR");
  });

  it("never includes stack trace in response body", async () => {
    const error = new Error("secret internal details");
    (error as unknown as Record<string, unknown>).stack = "at /src/secret/path.ts:42";

    const response = handleRouteError(error, "INTERNAL_ERROR");
    const text = await response.text();

    expect(text).not.toContain("secret internal details");
    expect(text).not.toContain("/src/secret/path.ts");
    expect(text).not.toContain("stack");
  });

  it("propagates x-request-id from request to error response", async () => {
    const request = makeRequest("req-abc-123");
    const error = new Error("fail");

    const response = handleRouteError(error, "INTERNAL_ERROR", request);

    expect(response.headers.get("x-request-id")).toBe("req-abc-123");
  });

  it("works without request parameter (no x-request-id)", async () => {
    const error = new Error("fail");

    const response = handleRouteError(error, "INTERNAL_ERROR");
    const body = await response.json();

    expect(response.headers.get("x-request-id")).toBeNull();
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("handles ApiError with different status codes correctly", async () => {
    const notFound = new FakeApiError("Não encontrado", "CAMPAIGN_NOT_FOUND", 404);
    const conflict = new FakeApiError("Já existe", "CAMPAIGN_CONFLICT", 409);

    const r1 = handleRouteError(notFound, "FALLBACK");
    const r2 = handleRouteError(conflict, "FALLBACK");

    expect(r1.status).toBe(404);
    expect(r2.status).toBe(409);
    expect((await r1.json()).code).toBe("CAMPAIGN_NOT_FOUND");
    expect((await r2.json()).code).toBe("CAMPAIGN_CONFLICT");
  });
});
