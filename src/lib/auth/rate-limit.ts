/**
 * Arquivo: src/lib/auth/rate-limit.ts
 * Propósito: Rate limiter com Upstash Redis (persistente, multi-instância).
 *            Fallback para in-memory se UPSTASH_REDIS_REST_URL não estiver configurado.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ------------------------------------------------------------------ */
/*  Detecta se Redis está disponível                                   */
/* ------------------------------------------------------------------ */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);

let redis: Redis | null = null;
if (useRedis) {
  redis = new Redis({ url: redisUrl!, token: redisToken! });
}

/* ------------------------------------------------------------------ */
/*  Fallback in-memory (dev ou se Redis não configurado)               */
/* ------------------------------------------------------------------ */

type InMemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, InMemoryEntry>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function memoryCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) memoryStore.delete(key);
  }
}

function checkRateLimitInMemory(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  memoryCleanup();
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

/* ------------------------------------------------------------------ */
/*  Cache de instâncias Ratelimit (Redis) por configuração             */
/* ------------------------------------------------------------------ */

const limiters = new Map<string, Ratelimit>();

function getRedisLimiter(maxAttempts: number, windowSeconds: number): Ratelimit {
  const key = `${maxAttempts}:${windowSeconds}`;
  let limiter = limiters.get(key);
  if (limiter) return limiter;

  limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s`),
    prefix: "axiomix:rl",
  });

  limiters.set(key, limiter);
  return limiter;
}

/* ------------------------------------------------------------------ */
/*  API pública — mesma interface de antes (agora async)               */
/* ------------------------------------------------------------------ */

/**
 * Verifica rate limit para uma chave (ex: IP ou email).
 * Retorna { allowed: true } ou { allowed: false, retryAfterSeconds }.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  if (!useRedis) {
    return checkRateLimitInMemory(key, maxAttempts, windowSeconds);
  }

  const limiter = getRedisLimiter(maxAttempts, windowSeconds);
  const { success, reset } = await limiter.limit(key);

  if (success) return { allowed: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

/**
 * Extrai o IP do cliente a partir dos headers da request.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Helper: aplica rate limit por IP e retorna 429 se excedido.
 * Retorna null se permitido, ou NextResponse 429 se bloqueado.
 */
export async function applyIpRateLimit(
  request: NextRequest,
  prefix: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await checkRateLimit(`${prefix}:${ip}`, maxAttempts, windowSeconds);
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit excedido. Tente novamente em ${result.retryAfterSeconds}s.`,
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      }
    );
  }
  return null;
}
