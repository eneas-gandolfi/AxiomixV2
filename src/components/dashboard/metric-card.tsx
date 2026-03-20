/**
 * Arquivo: src/components/dashboard/metric-card.tsx
 * Propósito: Card de métrica com variante hero, sparklines e animações
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import Link from "next/link";
import {
  ArrowRight,
  Flame,
  MessageSquare,
  Share2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useAnimatedValue } from "@/lib/hooks/use-animated-value";
import type { SparkData } from "@/types/modules/dashboard.types";

export type MetricIconName = "message-square" | "shopping-cart" | "share-2" | "flame";

const ICON_MAP: Record<MetricIconName, LucideIcon> = {
  "message-square": MessageSquare,
  "shopping-cart": ShoppingCart,
  "share-2": Share2,
  "flame": Flame,
};

export interface MetricCardProps {
  label: string;
  value: number;
  icon: MetricIconName;
  sublabel: string;
  change?: number | null;
  alert?: {
    count: number;
    label: string;
    variant: "danger" | "warning";
  };
  loading?: boolean;
  emptyMessage?: string;
  ctaLabel?: string;
  ctaHref?: string;
  emptyHint?: string;
  emptyAction?: {
    href: string;
    label: string;
  };
  variant?: "default" | "hero" | "status";
  sparkData?: SparkData;
  animationDelay?: string;
}

function renderDelta(delta: number | null | undefined, emptyMessage?: string) {
  if (delta === null || delta === undefined) {
    return (
      <span className="text-xs italic text-muted-light">
        {emptyMessage ?? "Sem histórico comparativo"}
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success">
        <TrendingUp className="h-[12px] w-[12px]" aria-label="Variação positiva" />
        +{delta}%
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-light px-2 py-0.5 text-xs font-medium text-danger">
        <TrendingDown className="h-[12px] w-[12px]" aria-label="Variação negativa" />
        {delta}%
      </span>
    );
  }

  return <span className="text-xs text-muted">— sem variação</span>;
}

function AlertBadge({ alert }: { alert: NonNullable<MetricCardProps["alert"]> }) {
  return (
    <span
      className={cn(
        "rounded px-2.5 py-1 text-xs",
        alert.variant === "danger"
          ? "bg-danger-light text-danger"
          : "bg-warning-light text-warning"
      )}
    >
      {alert.count} {alert.label}
    </span>
  );
}

function Sparkline({ data, color = "var(--color-primary)" }: { data: number[]; color?: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  sublabel,
  change,
  alert,
  loading,
  emptyMessage,
  ctaLabel,
  ctaHref,
  emptyHint,
  emptyAction,
  variant = "default",
  sparkData,
  animationDelay,
}: MetricCardProps) {
  const Icon = ICON_MAP[icon];
  const animatedValue = useAnimatedValue(value);

  if (loading) {
    return (
      <article
        className={cn(
          "rounded-xl border border-border bg-card p-3 shadow-card-modern sm:p-4",
          false
        )}
        aria-busy="true"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="h-4 w-2/3 skeleton-shimmer animate-shimmer rounded" />
          <div className="h-8 w-8 skeleton-shimmer animate-shimmer rounded-lg" />
        </div>
        <div className="mb-2 h-7 w-1/2 skeleton-shimmer animate-shimmer rounded" />
        <div className="h-3 w-3/4 skeleton-shimmer animate-shimmer rounded" />
      </article>
    );
  }

  const isHero = variant === "hero";
  const isStatus = variant === "status";

  return (
    <article
      className={cn(
        "group rounded-xl border bg-card p-3 transition-all duration-200 sm:p-4",
        "opacity-0 animate-fade-in-up",
        isHero
          ? "glass-card gradient-border-card shadow-card-elevated hover:shadow-card-hover-modern"
          : isStatus
            ? "border-border/80 bg-surface-2/50 shadow-card-modern hover:-translate-y-0.5 hover:shadow-card-hover-modern hover:border-primary/20"
            : "border-border shadow-card-modern hover:-translate-y-0.5 hover:shadow-card-hover-modern hover:border-primary/20",
        animationDelay
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className={cn("text-sm text-muted", (isHero || isStatus) && "section-label")}>{label}</p>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-lg transition-all duration-200 group-hover:shadow-md",
            isStatus
              ? "bg-warning-light group-hover:bg-warning group-hover:shadow-warning/20"
              : "bg-primary-light group-hover:bg-primary group-hover:shadow-primary/20",
            isHero ? "h-9 w-9" : "h-8 w-8"
          )}
        >
          <Icon
            className={cn(
              "transition-colors duration-200 group-hover:text-white",
              isStatus ? "text-warning" : "text-primary",
              "h-4 w-4"
            )}
            aria-label={label}
          />
        </span>
      </div>

      <p
        className={cn(
          "font-bold tracking-tight tabular-nums text-text",
          isHero ? "font-display text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        )}
      >
        {animatedValue.toLocaleString("pt-BR")}
      </p>

      <div className="mt-1">{renderDelta(change, emptyMessage)}</div>

      {sparkData && sparkData.length > 0 && (
        <div className={cn("mt-2", isHero ? "h-[36px]" : "h-[32px]")}>
          <Sparkline
            data={sparkData}
            color={isHero ? "var(--color-primary)" : "var(--color-text-tertiary)"}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted">{sublabel}</p>
        {alert && alert.count > 0 ? <AlertBadge alert={alert} /> : null}
      </div>

      {value === 0 && emptyHint ? (
        <div className="mt-2">
          <p className="text-xs text-muted">{emptyHint}</p>
          {emptyAction ? (
            <Link
              href={emptyAction.href}
              className="mt-1 inline-block text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {emptyAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}

      {ctaHref && ctaLabel ? (
        <div className="mt-2 border-t border-border pt-2">
          <Link
            href={ctaHref}
            className="flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {ctaLabel}
            <ArrowRight className="h-[11px] w-[11px]" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
