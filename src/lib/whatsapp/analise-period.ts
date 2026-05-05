/**
 * Arquivo: src/lib/whatsapp/analise-period.ts
 * Propósito: Tipos e helpers puros do period picker da aba Análise.
 *            Vivem fora de `analise-period-picker.tsx` (que tem "use client")
 *            pra que Server Components possam chamar `parsePeriodFromParam`
 *            sem violar a barreira client/server do Next.js.
 * Autor: AXIOMIX
 * Data: 2026-05-08
 */

export const VALID_PERIODS = [7, 30, 90] as const;

export type PeriodDays = (typeof VALID_PERIODS)[number];

export const DEFAULT_PERIOD: PeriodDays = 30;

export function isValidPeriod(value: unknown): value is PeriodDays {
  return (
    typeof value === "number" &&
    (VALID_PERIODS as readonly number[]).includes(value)
  );
}

export function parsePeriodFromParam(
  raw: string | string[] | undefined,
): PeriodDays {
  if (typeof raw !== "string") return DEFAULT_PERIOD;
  const num = parseInt(raw, 10);
  return isValidPeriod(num) ? num : DEFAULT_PERIOD;
}
