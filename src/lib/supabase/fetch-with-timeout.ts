/**
 * Arquivo: src/lib/supabase/fetch-with-timeout.ts
 * Propósito: Fetch com timeout para os clients Supabase. Sem isso, uma query
 *            pendurada no PostgREST prende o RSC indefinidamente (skeleton
 *            eterno no dashboard). Timeout padrão de 10s, combinável com o
 *            signal do caller.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

export const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function createFetchWithTimeout(
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
  fetchImpl: FetchLike = fetch,
): FetchLike {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;

    return fetchImpl(input, { ...init, signal });
  };
}

export const supabaseFetch = createFetchWithTimeout();
