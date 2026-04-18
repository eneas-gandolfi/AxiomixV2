/**
 * Arquivo: src/components/dashboard/sentiment-overview.tsx
 * Propósito: Donut chart de sentimento das conversas com legenda rica
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
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
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

const COLORS = {
  positive: "var(--color-success)",
  neutral: "var(--color-warning)",
  negative: "var(--color-danger)",
};

export function SentimentOverview({ data }: SentimentOverviewProps) {
  if (data.total === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-text">Sentimento das conversas</h2>
          <span className="rounded-md bg-sidebar px-2 py-1 text-xs text-muted">
            Últimos 7 dias
          </span>
        </header>
        <div className="flex min-h-[80px] flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle py-4 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sidebar">
            <MessageSquare size={20} className="text-muted-light" aria-hidden="true" />
          </span>
          <p className="max-w-[280px] text-sm text-muted">
            Nenhuma conversa analisada ainda. Conecte o Evo CRM para começar.
          </p>
        </div>
      </section>
    );
  }

  const positivePercent = percent(data.positive, data.total);
  const neutralPercent = percent(data.neutral, data.total);
  const negativePercent = percent(data.negative, data.total);

  const chartData = [
    { name: "Positivo", value: data.positive, color: COLORS.positive },
    { name: "Neutro", value: data.neutral, color: COLORS.neutral },
    { name: "Negativo", value: data.negative, color: COLORS.negative },
  ].filter((d) => d.value > 0);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-text">Sentimento das conversas</h2>
        <span className="rounded-md bg-sidebar px-2 py-1 text-xs text-muted">
          Últimos 7 dias
        </span>
      </header>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative h-[140px] w-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                dataKey="value"
                strokeWidth={0}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Total centralizado */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-text">
              {data.total.toLocaleString("pt-BR")}
            </span>
            <span className="text-[10px] text-muted">total</span>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-light">
              <Smile className="h-3.5 w-3.5 text-success" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Positivo</p>
              <p className="text-xs text-muted tabular-nums">{positivePercent}% · {data.positive} conv.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning-light">
              <Meh className="h-3.5 w-3.5 text-warning" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Neutro</p>
              <p className="text-xs text-muted tabular-nums">{neutralPercent}% · {data.neutral} conv.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-danger-light">
              <Frown className="h-3.5 w-3.5 text-danger" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Negativo</p>
              <p className="text-xs text-muted tabular-nums">{negativePercent}% · {data.negative} conv.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
