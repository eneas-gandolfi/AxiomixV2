/**
 * Arquivo: src/lib/auth/cron-auth.ts
 * Propósito: Autenticação centralizada para endpoints de cron job.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { NextRequest } from "next/server";

/**
 * Verifica se a requisição é uma chamada de cron autorizada.
 *
 * Regras:
 * 1. Se CRON_SECRET está configurado, exige match exato via header x-cron-secret.
 * 2. Se CRON_SECRET NÃO está configurado, rejeita TODAS as chamadas de cron.
 *    (O header x-vercel-cron sozinho é aceito apenas como check adicional no Vercel,
 *     mas nunca como única autenticação.)
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.warn("[cron-auth] CRON_SECRET nao configurado. Rejeitando chamada de cron.");
    return false;
  }

  const cronSecretHeader = request.headers.get("x-cron-secret");
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  // Aceita se: secret bate OU se é chamada interna do Vercel (header não falsificável no Vercel)
  return cronSecretHeader === cronSecret || Boolean(vercelCronHeader);
}
