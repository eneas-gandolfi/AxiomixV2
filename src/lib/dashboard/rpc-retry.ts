/**
 * Arquivo: src/lib/dashboard/rpc-retry.ts
 * Propósito: Retry com backoff curto para chamadas RPC críticas do dashboard.
 *            Cobre blips transitórios do Supabase (ex.: gateway recusando
 *            conexão por segundos) sem derrubar a página inteira.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

const DEFAULT_BACKOFF_MS = [500, 1500];

type RpcResult<T> = { data: T | null; error: unknown };

type RetryOptions = {
  backoffMs?: number[];
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRpcRetry<T>(
  run: () => PromiseLike<RpcResult<T>>,
  { backoffMs = DEFAULT_BACKOFF_MS, sleep = defaultSleep }: RetryOptions = {},
): Promise<RpcResult<T>> {
  let result = await run();

  for (const delayMs of backoffMs) {
    if (!result.error) {
      return result;
    }
    await sleep(delayMs);
    result = await run();
  }

  return result;
}
