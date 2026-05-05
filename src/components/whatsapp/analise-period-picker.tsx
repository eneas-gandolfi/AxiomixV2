/**
 * Arquivo: src/components/whatsapp/analise-period-picker.tsx
 * Propósito: Picker de janela temporal pra aba Análise (7d/30d/90d).
 *            Atualiza ?period= na URL — Server Components da página leem
 *            via searchParams e re-fetcham com a nova janela.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const;

export type PeriodDays = (typeof PERIODS)[number]["value"];

export const VALID_PERIODS: ReadonlyArray<PeriodDays> = PERIODS.map((p) => p.value);
export const DEFAULT_PERIOD: PeriodDays = 30;

export function isValidPeriod(value: unknown): value is PeriodDays {
  return typeof value === "number" && (VALID_PERIODS as readonly number[]).includes(value);
}

export function parsePeriodFromParam(raw: string | string[] | undefined): PeriodDays {
  if (typeof raw !== "string") return DEFAULT_PERIOD;
  const num = parseInt(raw, 10);
  return isValidPeriod(num) ? num : DEFAULT_PERIOD;
}

export function AnalisePeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRaw = searchParams.get("period");
  const current = parsePeriodFromParam(currentRaw ?? undefined);

  const handleSelect = (period: PeriodDays) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === DEFAULT_PERIOD) {
      params.delete("period");
    } else {
      params.set("period", String(period));
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div
      className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5"
      role="group"
      aria-label="Janela temporal"
    >
      {PERIODS.map((p) => {
        const isActive = current === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => handleSelect(p.value)}
            aria-pressed={isActive}
            className={`px-3 py-1 font-mono text-xs rounded-md transition-colors ${
              isActive
                ? "bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
