import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
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

export function MetricCard({
  label,
  value,
  icon: Icon,
  sublabel,
  change,
  alert,
  loading,
  emptyMessage,
  ctaLabel,
  ctaHref,
  emptyHint,
  emptyAction,
}: MetricCardProps) {
  if (loading) {
    return (
      <article
        className="rounded-xl border border-border bg-card p-3 shadow-card sm:p-4"
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

  return (
    <article className="group rounded-xl border border-border bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light transition-colors duration-200 group-hover:bg-primary group-hover:shadow-sm">
          <Icon className="h-4 w-4 text-primary transition-colors duration-200 group-hover:text-white" aria-label={label} />
        </span>
      </div>

      <p className="text-xl font-bold tracking-tight tabular-nums text-text sm:text-2xl">{value}</p>

      <div className="mt-1">{renderDelta(change, emptyMessage)}</div>

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
