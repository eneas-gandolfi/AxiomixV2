/**
 * Arquivo: src/lib/supabase/__tests__/fetch-with-timeout.test.ts
 * Propósito: Garantir que o fetch dos clients Supabase aborta requests penduradas
 *            (timeout) sem interferir em requests rápidas nem em signals do caller.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

import { describe, expect, it } from "vitest";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";

function hangingFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(init.signal?.reason ?? new Error("aborted"));
    });
  });
}

describe("createFetchWithTimeout", () => {
  it("aborta request pendurada após o timeout com TimeoutError", async () => {
    const fetchWithTimeout = createFetchWithTimeout(20, hangingFetch);

    await expect(fetchWithTimeout("https://example.test")).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });

  it("resolve normalmente quando a request termina antes do timeout", async () => {
    const fetchWithTimeout = createFetchWithTimeout(1_000, async () => new Response("ok"));

    const response = await fetchWithTimeout("https://example.test");

    expect(await response.text()).toBe("ok");
  });

  it("respeita abort do signal do caller mesmo antes do timeout", async () => {
    const fetchWithTimeout = createFetchWithTimeout(10_000, hangingFetch);
    const caller = new AbortController();
    const pending = fetchWithTimeout("https://example.test", { signal: caller.signal });

    caller.abort(new DOMException("cancelado pelo caller", "AbortError"));

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
