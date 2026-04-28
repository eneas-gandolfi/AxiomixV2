/**
 * Arquivo: src/lib/api/handle-route-error.ts
 * Propósito: Error handler centralizado para route handlers — normaliza erros, nunca vaza stack.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { REQUEST_ID_HEADER } from "@/lib/observability/request-id";

type ApiError = { message: string; code: string; status: number };

function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    typeof (error as Record<string, unknown>).code === "string" &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

/**
 * Centraliza o tratamento de erros em route handlers.
 *
 * Uso:
 * ```ts
 * catch (error) {
 *   return handleRouteError(error, "DOMAIN_ERROR", request);
 * }
 * ```
 *
 * - CompanyAccessError, CampaignError, etc. → usa `.code` e `.status` do erro
 * - ZodError → 400 VALIDATION_ERROR com primeira mensagem
 * - Qualquer outro → 500 com fallbackCode, sem vazar stack
 */
export function handleRouteError(
  error: unknown,
  fallbackCode: string,
  request?: NextRequest
): NextResponse {
  const requestId = request?.headers.get(REQUEST_ID_HEADER) ?? undefined;
  const headers: Record<string, string> = {};
  if (requestId) {
    headers[REQUEST_ID_HEADER] = requestId;
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Dados inválidos", code: "VALIDATION_ERROR" },
      { status: 400, headers }
    );
  }

  if (isApiError(error)) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status, headers }
    );
  }

  return NextResponse.json(
    { error: "Erro interno", code: fallbackCode },
    { status: 500, headers }
  );
}
