/**
 * Arquivo: src/lib/whatsapp/calendar-days.ts
 * Propósito: Helpers puros para contagem de dias de calendário no fuso
 *            America/Sao_Paulo. Centraliza o conceito de "dia em SP" para
 *            que múltiplos consumidores (cold-leads, painel ao vivo) batam
 *            com a data exibida ao usuário (ex.: "desde 04/05").
 *
 *            Diferente de dividir milissegundos por 24h, esta diferença
 *            muda na virada da meia-noite local, não num horário arbitrário.
 * Autor: AXIOMIX
 * Data: 2026-05-14
 */

export const TIMEZONE = "America/Sao_Paulo";

/** Retorna o dia calendário no fuso SP no formato `YYYY-MM-DD`. */
export function localDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Diferença em dias de calendário (SP) entre `from` e `to`, clampada a >= 0. */
export function diffCalendarDaysInTz(from: Date, to: Date): number {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const fromKey = localDateKey(from);
  const toKey = localDateKey(to);
  const fromUtcMidnight = Date.UTC(
    Number(fromKey.slice(0, 4)),
    Number(fromKey.slice(5, 7)) - 1,
    Number(fromKey.slice(8, 10)),
  );
  const toUtcMidnight = Date.UTC(
    Number(toKey.slice(0, 4)),
    Number(toKey.slice(5, 7)) - 1,
    Number(toKey.slice(8, 10)),
  );
  return Math.max(0, Math.floor((toUtcMidnight - fromUtcMidnight) / 86_400_000));
}
