/**
 * Arquivo: src/lib/auth/cron-auth.ts
 * Proposito: Autenticacao centralizada para endpoints de cron job.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { NextRequest } from "next/server";

/**
 * Verifica se a requisicao e uma chamada de cron autorizada.
 *
 * Regras:
 * 1. Se CRON_SECRET esta configurado, aceita:
 *    - x-cron-secret: <CRON_SECRET> (cron-job.org / externos)
 *    - Authorization: Bearer <CRON_SECRET> (Vercel Cron)
 * 2. O header x-vercel-cron continua aceito como compatibilidade adicional.
 * 3. Se CRON_SECRET nao esta configurado, rejeita todas as chamadas de cron.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.warn("[cron-auth] CRON_SECRET nao configurado. Rejeitando chamada de cron.");
    return false;
  }

  const cronSecretHeader = request.headers.get("x-cron-secret");
  const authorizationHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const expectedAuthorizationHeader = `Bearer ${cronSecret}`;

  return (
    cronSecretHeader === cronSecret ||
    authorizationHeader === expectedAuthorizationHeader ||
    Boolean(vercelCronHeader)
  );
}
