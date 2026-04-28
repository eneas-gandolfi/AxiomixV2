/**
 * Arquivo: src/lib/observability/request-context.ts
 * Propósito: AsyncLocalStorage para propagação de contexto de request (requestId, tenantId, userId).
 * Autor: AXIOMIX
 * Data: 2026-04-28
 */

import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
  tenantId?: string;
  userId?: string;
};

export const requestStore = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}
