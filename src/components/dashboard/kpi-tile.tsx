/**
 * Arquivo: src/components/dashboard/kpi-tile.tsx
 * Propósito: Tile pequeno de KPI secundário no dashboard global. Aceita 2
 *            estados: 'live' (com valor) e 'coming-soon' (cinza, não-clicável).
 *            "Em breve" sussurra roadmap sem fingir números — Sally cedeu pro
 *            Winston desde que não ficasse cemitério de retângulos vazios.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

"use client";

import { cn } from "@/lib/utils";

export type KpiTileState = "live" | "coming-soon";

export interface KpiTileProps {
  label: string;
  /** Valor formatado pra exibição. Ignorado quando state === 'coming-soon'. */
  value?: string | number;
  /** Texto de apoio embaixo do valor (ex: "últimos 7 dias"). */
  sublabel?: string;
  state?: KpiTileState;
  /** Tooltip opcional pra "Em breve" — explica o que vem por aí. */
  comingSoonHint?: string;
}

export function KpiTile({
  label,
  value,
  sublabel,
  state = "live",
  comingSoonHint,
}: KpiTileProps) {
  const isDisabled = state === "coming-soon";

  return (
    <div
      data-testid="kpi-tile"
      data-state={state}
      aria-disabled={isDisabled || undefined}
      className={cn(
        "dashboard-panel rounded-2xl p-4",
        isDisabled && "opacity-60 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="ax-kpi-label">{label}</span>
        {isDisabled && (
          <span
            title={comingSoonHint}
            className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
          >
            Em breve
          </span>
        )}
      </div>

      <p
        className={cn(
          "mt-2 ax-kpi text-3xl",
          isDisabled && "text-[var(--color-text-tertiary)]",
        )}
      >
        {isDisabled ? "—" : (value ?? "—")}
      </p>

      {sublabel && (
        <p
          className={cn(
            "mt-1 ax-caption",
            isDisabled && "text-[var(--color-text-tertiary)]",
          )}
        >
          {isDisabled ? (comingSoonHint ?? "Disponível em breve") : sublabel}
        </p>
      )}
    </div>
  );
}
