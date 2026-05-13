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

import Link from "next/link";
import type { ReactNode } from "react";
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
  /** Destaque visual de urgência (valor em danger, fundo danger-light). */
  urgent?: boolean;
  /** Quando setado, o tile inteiro vira link clicável pra essa rota. */
  href?: string;
}

export function KpiTile({
  label,
  value,
  sublabel,
  state = "live",
  comingSoonHint,
  urgent = false,
  href,
}: KpiTileProps) {
  const isDisabled = state === "coming-soon";
  const isLinked = !isDisabled && Boolean(href);

  const wrap = (children: ReactNode) =>
    isLinked && href ? (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-2xl"
      >
        {children}
      </Link>
    ) : (
      <>{children}</>
    );

  return wrap(
    <div
      data-testid="kpi-tile"
      data-state={state}
      data-urgent={urgent || undefined}
      aria-disabled={isDisabled || undefined}
      className={cn(
        "dashboard-panel rounded-2xl p-4",
        urgent && "border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)]",
        isLinked && "transition-shadow hover:shadow-md cursor-pointer",
        isDisabled && "opacity-60 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "ax-kpi-label",
            urgent && "text-[var(--color-danger)]",
          )}
        >
          {label}
        </span>
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
          urgent && "text-[var(--color-danger)]",
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
