/**
 * Arquivo: src/lib/observability/request-id.ts
 * Propósito: Gerar e propagar correlation IDs (request IDs) para rastreamento.
 * Autor: AXIOMIX
 * Data: 2026-04-10
 */

import { NextRequest } from "next/server";

const HEADER_NAME = "x-request-id";

/**
 * Gera um request ID curto e único (12 chars hex).
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Extrai ou gera um request ID a partir do request.
 * Se o header x-request-id já existir (proxy upstream), usa ele.
 */
export function resolveRequestId(request: NextRequest): string {
  return request.headers.get(HEADER_NAME) ?? generateRequestId();
}

/**
 * Nome do header para propagação.
 */
export { HEADER_NAME as REQUEST_ID_HEADER };
