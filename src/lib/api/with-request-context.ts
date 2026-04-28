/**
 * Arquivo: src/lib/api/with-request-context.ts
 * Propósito: Wrapper para route handlers que configura AsyncLocalStorage com requestId.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 *
 * Uso:
 * ```ts
 * export const POST = withRequestContext(async (request) => {
 *   log.info("processando"); // requestId auto-attached
 *   // ... lógica
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { requestStore } from "@/lib/observability/request-context";
import { REQUEST_ID_HEADER } from "@/lib/observability/request-id";
import { handleRouteError } from "@/lib/api/handle-route-error";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps a route handler with:
 * 1. AsyncLocalStorage context (requestId auto-propagated to logger)
 * 2. Top-level error catching via handleRouteError
 */
export function withRequestContext(
  handler: RouteHandler,
  fallbackErrorCode = "INTERNAL_ERROR"
): RouteHandler {
  return async (request, context) => {
    const requestId = request.headers.get(REQUEST_ID_HEADER) ?? "unknown";

    return requestStore.run({ requestId }, async () => {
      try {
        return await handler(request, context);
      } catch (error) {
        return handleRouteError(error, fallbackErrorCode, request);
      }
    });
  };
}
