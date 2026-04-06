/**
 * Arquivo: src/lib/auth/rate-limit.ts
 * Propósito: Rate limiter in-memory para proteger endpoints sensíveis contra brute force e abuso.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";

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
export function applyIpRateLimit(
  request: NextRequest,
  prefix: string,
  maxAttempts: number,
  windowSeconds: number
): NextResponse | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${prefix}:${ip}`, maxAttempts, windowSeconds);
  if (!result.allowed) {
    return NextResponse.json(
      { error: `Rate limit excedido. Tente novamente em ${result.retryAfterSeconds}s.`, code: "RATE_LIMITED" },
      { status: 429 }
    );
  }
  return null;
}
