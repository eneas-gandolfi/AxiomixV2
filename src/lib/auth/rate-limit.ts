/**
 * Arquivo: src/lib/auth/rate-limit.ts
 * Propósito: Rate limiter in-memory para proteger endpoints sensíveis contra brute force.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Verifica rate limit para uma chave (ex: IP ou email).
 * Retorna { allowed: true } ou { allowed: false, retryAfterSeconds }.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}
