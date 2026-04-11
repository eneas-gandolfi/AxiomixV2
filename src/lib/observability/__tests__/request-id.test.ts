import { describe, it, expect } from "vitest";
import { resolveRequestId, REQUEST_ID_HEADER } from "../request-id";
import { NextRequest } from "next/server";

describe("resolveRequestId", () => {
  it("gera um ID quando header ausente", () => {
    const req = new NextRequest("http://localhost:3000/api/test");
    const id = resolveRequestId(req);
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(5);
  });

  it("usa header existente quando presente", () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { [REQUEST_ID_HEADER]: "upstream-123" },
    });
    expect(resolveRequestId(req)).toBe("upstream-123");
  });

  it("gera IDs únicos para requests diferentes", () => {
    const req1 = new NextRequest("http://localhost:3000/api/a");
    const req2 = new NextRequest("http://localhost:3000/api/b");
    const id1 = resolveRequestId(req1);
    const id2 = resolveRequestId(req2);
    expect(id1).not.toBe(id2);
  });
});
