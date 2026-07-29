/**
 * Arquivo: src/lib/dashboard/__tests__/rpc-retry.test.ts
 * Propósito: Garantir que chamadas RPC do dashboard sobrevivem a blips curtos
 *            do Supabase (retry com backoff) sem mascarar falhas persistentes.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

import { describe, expect, it, vi } from "vitest";
import { withRpcRetry } from "@/lib/dashboard/rpc-retry";

const noWait = () => Promise.resolve();

describe("withRpcRetry", () => {
  it("retorna o resultado na primeira tentativa quando não há erro", async () => {
    const run = vi.fn().mockResolvedValue({ data: [{ user_id: "u1" }], error: null });

    const result = await withRpcRetry(run, { sleep: noWait });

    expect(result.data).toEqual([{ user_id: "u1" }]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo em erro transitório e devolve o primeiro sucesso", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "upstream connect error" } })
      .mockResolvedValueOnce({ data: null, error: { message: "upstream connect error" } })
      .mockResolvedValueOnce({ data: [{ user_id: "u1" }], error: null });

    const result = await withRpcRetry(run, { sleep: noWait });

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ user_id: "u1" }]);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("devolve o último erro após esgotar as tentativas", async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout" } });

    const result = await withRpcRetry(run, { sleep: noWait });

    expect(result.error).toEqual({ message: "timeout" });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("espera os backoffs configurados entre tentativas", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: "falha" } });

    await withRpcRetry(run, { sleep });

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1500]);
  });
});
