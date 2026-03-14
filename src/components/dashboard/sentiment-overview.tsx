"use client";

import { useEffect, useState } from "react";
import { Frown, Meh, MessageSquare, Smile } from "lucide-react";

export type SentimentOverviewData = {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
};

type SentimentOverviewProps = {
  data: SentimentOverviewData;
};

function percent(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

function barWidth(percentage: number, mounted: boolean) {
  if (!mounted) {
    return "0%";
  }

  return percentage === 0 ? "2px" : `${percentage}%`;
}

export function SentimentOverview({ data }: SentimentOverviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (data.total === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-text">Sentimento das conversas</h2>
          <span className="rounded-md bg-sidebar px-2 py-1 text-xs text-muted">
            Últimos 7 dias
          </span>
        </header>
        <div className="flex min-h-[80px] flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle py-4 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sidebar">
            <MessageSquare
              size={20}
              className="text-muted-light"
              aria-hidden="true"
            />
          </span>
          <p className="max-w-[280px] text-sm text-muted">
            Nenhuma conversa analisada ainda. Conecte o Sofia CRM para começar.
          </p>
        </div>
      </section>
    );
  }

  const positivePercent = percent(data.positive, data.total);
  const neutralPercent = percent(data.neutral, data.total);
  const negativePercent = percent(data.negative, data.total);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text">Sentimento das conversas</h2>
        <span className="rounded-md bg-sidebar px-2 py-1 text-xs text-muted">
          Últimos 7 dias
        </span>
      </header>

      <div className="space-y-2.5">
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-light">
              <Smile className="h-3.5 w-3.5 text-success" aria-label="Positivo" />
            </span>
            Positivo
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-success transition-all duration-700"
              style={{ width: barWidth(positivePercent, mounted) }}
            />
          </div>
          <p className="text-sm text-text">{positivePercent}%</p>
          <p className="text-xs text-muted">({data.positive} conv.)</p>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning-light">
              <Meh className="h-3.5 w-3.5 text-warning" aria-label="Neutro" />
            </span>
            Neutro
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-warning transition-all duration-700"
              style={{ width: barWidth(neutralPercent, mounted) }}
            />
          </div>
          <p className="text-sm text-text">{neutralPercent}%</p>
          <p className="text-xs text-muted">({data.neutral} conv.)</p>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger-light">
              <Frown className="h-3.5 w-3.5 text-danger" aria-label="Negativo" />
            </span>
            Negativo
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-danger transition-all duration-700"
              style={{ width: barWidth(negativePercent, mounted) }}
            />
          </div>
          <p className="text-sm text-text">{negativePercent}%</p>
          <p className="text-xs text-muted">({data.negative} conv.)</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-surface-subtle px-3 py-2 text-xs text-muted-light">
        {data.total} conversas analisadas no período
      </p>
    </section>
  );
}
