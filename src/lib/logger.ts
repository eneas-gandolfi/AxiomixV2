/**
 * Arquivo: src/lib/logger.ts
 * Propósito: Structured logger com auto-attach de requestId via AsyncLocalStorage.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 *
 * Wrapper fino sobre console. API-compatível com Pino para migração futura.
 * Uso: import { log } from "@/lib/logger";
 *       log.info("mensagem", { extra: "contexto" });
 */

import { getRequestContext } from "@/lib/observability/request-context";

type LogContext = Record<string, unknown>;

function buildEntry(
  level: string,
  msg: string,
  ctx?: LogContext
): string {
  const requestContext = getRequestContext();

  const entry: Record<string, unknown> = {
    level,
    msg,
    timestamp: new Date().toISOString(),
  };

  // Auto-attach from AsyncLocalStorage (requestId, tenantId, userId)
  if (requestContext?.requestId) entry.requestId = requestContext.requestId;
  if (requestContext?.tenantId) entry.tenantId = requestContext.tenantId;
  if (requestContext?.userId) entry.userId = requestContext.userId;

  // Explicit context overrides auto-attached values
  if (ctx) {
    Object.assign(entry, ctx);
  }

  return JSON.stringify(entry);
}

export const log = {
  info(msg: string, ctx?: LogContext) {
    console.log(buildEntry("info", msg, ctx));
  },
  warn(msg: string, ctx?: LogContext) {
    console.warn(buildEntry("warn", msg, ctx));
  },
  error(msg: string, ctx?: LogContext) {
    console.error(buildEntry("error", msg, ctx));
  },
};
