/**
 * Arquivo: src/components/whatsapp/analise-period-picker.tsx
 * Propósito: Picker de janela temporal pra aba Análise (7d/30d/90d).
 *            Atualiza ?period= na URL — Server Components da página leem
 *            via parsePeriodFromParam (em @/lib/whatsapp/analise-period).
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PERIOD,
  parsePeriodFromParam,
  VALID_PERIODS,
  type PeriodDays,
} from "@/lib/whatsapp/analise-period";

const PERIOD_LABELS: Record<PeriodDays, string> = {
  7: "7d",
  30: "30d",
  90: "90d",
};

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
      {VALID_PERIODS.map((period) => {
        const isActive = current === period;
        return (
          <button
            key={period}
            type="button"
            onClick={() => handleSelect(period)}
            aria-pressed={isActive}
            className={`px-3 py-1 font-mono text-xs rounded-md transition-colors ${
              isActive
                ? "bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            }`}
          >
            {PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
