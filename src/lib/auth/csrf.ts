/**
 * Arquivo: src/lib/auth/csrf.ts
 * Propósito: Proteção CSRF via validação de Origin/Referer para API routes mutantes.
 * Autor: AXIOMIX
 * Data: 2026-04-10
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Obtém os hosts permitidos a partir da URL da app.
 */
function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch { /* ignore invalid */ }
  }

  // Sempre permitir localhost em dev
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");

  return origins;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Valida proteção CSRF para requests mutantes (POST/PUT/DELETE/PATCH).
 *
 * Pular validação para:
 * - Métodos seguros (GET, HEAD, OPTIONS)
 * - Requests com header Authorization (API clients, não browsers)
 * - Webhooks (paths com /webhooks/ ou /cron/)
 *
 * Retorna null se OK, ou NextResponse 403 se bloqueado.
 */
export function verifyCsrf(request: NextRequest): NextResponse | null {
  // Métodos seguros não precisam de CSRF
  if (SAFE_METHODS.has(request.method)) return null;

  // Webhooks e crons são chamados por serviços externos, não browsers
  const path = request.nextUrl.pathname;
  if (path.includes("/webhooks/") || path.includes("/cron/")) return null;

  // Requests com Authorization header são de API clients, não browsers
  if (request.headers.has("authorization")) return null;

  // Requests com QStash signature são de Upstash
  if (request.headers.has("upstash-signature")) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Se não tem Origin nem Referer, pode ser fetch server-side — permitir
  if (!origin && !referer) return null;

  const allowedOrigins = getAllowedOrigins();

  // Verificar Origin (preferido)
  if (origin) {
    if (allowedOrigins.has(origin)) return null;
    console.warn("[csrf] Origin bloqueado:", origin);
    return NextResponse.json(
      { error: "Requisição bloqueada (CSRF).", code: "CSRF_BLOCKED" },
      { status: 403 }
    );
  }

  // Fallback para Referer
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) return null;
    } catch { /* invalid referer */ }
    console.warn("[csrf] Referer bloqueado:", referer);
    return NextResponse.json(
      { error: "Requisição bloqueada (CSRF).", code: "CSRF_BLOCKED" },
      { status: 403 }
    );
  }

  return null;
}
