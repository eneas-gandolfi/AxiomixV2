/**
 * Arquivo: src/components/dashboard/hero-metric.tsx
 * Propósito: Número-herói do dashboard global. Estado emocional do negócio
 *            antes dos KPIs (Sally's red line). 3 variantes:
 *              0  → verde silencioso, "Tudo respondido. Bom trabalho."
 *              1-3 → âmbar, "X clientes esperando há mais de Ymin — abrir fila"
 *              4+ → vermelho com pulse, "X clientes esperando. A fila tá afogando."
 *            Estado especial `isCalibrating` (primeiros 7 dias) sobrepõe a copy
 *            pra não soar morto enquanto baseline é coletado.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StalledItem } from "@/lib/dashboard/selectors/stalledConversations";

export type HeroMetricState = "idle" | "amber" | "red" | "calibrating";

export interface HeroMetricProps {
  /** Contagem atual de itens em risco (conversas paradas, leads esperando...). */
  count: number;
  /** Label niche-aware vindo de `vocabulary.heroMetricLabel`. */
  label: string;
  /** Substantivo do "cliente" no nicho (singular + plural). */
  customerNoun: { singular: string; plural: string };
  /** Threshold em segundos pra entrar em risco — usado na copy "há mais de X". */
  thresholdSeconds: number;
  /** Destino do CTA (1 clique pra Operação). */
  ctaHref: string;
  /** Top N items parados pra exibir como "preview list" abaixo do título.
   *  Quando vazio (ou state !== amber/red), nada é renderizado.
   *  Na prática: 2-3 itens de `stalled.items` ordenados por waitSeconds desc. */
  topItems?: StalledItem[];
  /** Quando true, ignora `count` e mostra copy de baseline. Para os primeiros
   *  7 dias depois do onboarding, antes da loja ter histórico estável. */
  isCalibrating?: boolean;
  className?: string;
}

const MAX_PREVIEW_ITEMS = 3;

export function formatWaitLabel(waitSeconds: number): string {
  if (waitSeconds >= 86400) return `há ${Math.round(waitSeconds / 86400)}d`;
  if (waitSeconds >= 3600) return `há ${Math.round(waitSeconds / 3600)}h`;
  return `há ${Math.round(waitSeconds / 60)}min`;
}

export function deriveHeroState(
  count: number,
  isCalibrating: boolean,
): HeroMetricState {
  if (isCalibrating) return "calibrating";
  if (count === 0) return "idle";
  if (count <= 3) return "amber";
  return "red";
}

export function formatHeroThreshold(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}min`;
}

export type HeroCopy = {
  title: string;
  body: string;
  ctaLabel: string;
};

export function getHeroCopy(
  state: HeroMetricState,
  count: number,
  customerNoun: { singular: string; plural: string },
  thresholdSeconds: number,
  label: string,
): HeroCopy {
  const noun = count === 1 ? customerNoun.singular : customerNoun.plural;
  const thresholdLabel = formatHeroThreshold(thresholdSeconds);

  if (state === "calibrating") {
    return {
      title: `${label} · estamos calibrando`,
      body: `Nos próximos 7 dias coletamos o ritmo da sua loja. Por enquanto, qualquer ${customerNoun.singular.toLowerCase()} parado aparece aqui.`,
      ctaLabel: "Ver operação",
    };
  }
  if (state === "idle") {
    return {
      title: "Tudo respondido. Bom trabalho.",
      body: `Nenhum ${customerNoun.singular.toLowerCase()} esperando agora. Cronômetro do nicho: ${thresholdLabel}.`,
      ctaLabel: "Abrir operação",
    };
  }
  if (state === "amber") {
    return {
      title: `${noun} parado${count === 1 ? "" : "s"} há mais de ${thresholdLabel}`,
      body: "Abrir a fila resolve em poucos toques — quanto antes, melhor a experiência.",
      ctaLabel: "Abrir fila",
    };
  }
  // red — tom de urgência, número fica no badge
  return {
    title: `${customerNoun.plural} em risco — fila afogando`,
    body: "Considere acionar mais alguém da equipe enquanto você abre a fila.",
    ctaLabel: "Chamar reforço",
  };
}

export function HeroMetric({
  count,
  label,
  customerNoun,
  thresholdSeconds,
  ctaHref,
  topItems,
  isCalibrating = false,
  className,
}: HeroMetricProps) {
  const state = deriveHeroState(count, isCalibrating);
  const copy = getHeroCopy(state, count, customerNoun, thresholdSeconds, label);
  const showBadge = state === "amber" || state === "red";
  const previewItems =
    showBadge && topItems && topItems.length > 0
      ? topItems.slice(0, MAX_PREVIEW_ITEMS)
      : [];
  const overflow = (topItems?.length ?? 0) - previewItems.length;

  const badgeClasses = cn(
    "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5",
    "font-display text-sm font-bold tabular-nums tracking-tight",
    state === "amber" && "bg-[var(--color-warning)] text-white",
    state === "red" && "bg-[var(--color-danger)] text-white animate-pulse",
  );

  const accentColor =
    state === "red"
      ? "var(--color-danger)"
      : state === "amber"
        ? "var(--color-warning)"
        : "var(--color-primary)";

  return (
    <div
      data-testid="hero-metric"
      data-state={state}
      className={cn(
        "dashboard-panel relative flex flex-col gap-3 rounded-[24px] p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
          {label}
        </span>
        {showBadge && (
          <span className={badgeClasses} aria-live="polite">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {count}
          </span>
        )}
      </div>

      <h2 className="font-display font-bold leading-snug tracking-tight text-xl sm:text-2xl">
        {copy.title}
      </h2>

      <p className="ax-body text-[var(--color-text-secondary)]">{copy.body}</p>

      {previewItems.length > 0 && (
        <ul
          data-testid="hero-metric-preview"
          className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
        >
          {previewItems.map((item) => (
            <li
              key={item.conversationId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 truncate text-[var(--color-text)]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: accentColor }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium">{item.customerName}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
                {formatWaitLabel(item.waitSeconds)}
              </span>
            </li>
          ))}
          {overflow > 0 && (
            <li className="pt-0.5 text-xs text-[var(--color-text-tertiary)]">
              + {overflow} {overflow === 1 ? "outro" : "outros"} esperando
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto pt-2">
        <Link
          href={ctaHref}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
            state === "red"
              ? "bg-[var(--color-danger)] text-white hover:opacity-90"
              : state === "amber"
                ? "bg-[var(--color-warning)] text-white hover:opacity-90"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]",
          )}
        >
          {copy.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
