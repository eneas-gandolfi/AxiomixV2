/**
 * Arquivo: src/components/dashboard/sentiment-overview.tsx
 * Propósito: Donut de sentimento das conversas (últimos 7 dias) com legenda
 *            sóbria (sem emoji-icons — Caravaggio's red line). Estados vazio
 *            e calibrando seguem o padrão "Coletando amostra X de Y" da Sally,
 *            com badge HEURÍSTICA tracejado quando amostra insuficiente.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import { Hourglass, MessageSquare, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

/** Amostra mínima pra mostrar percentuais. Abaixo disso o donut mente
 *  estatisticamente (ex: 1 de 2 conversas → "50%" não significa nada).
 *  Sally cravou: melhor honesto que aparente. */
export const SENTIMENT_MIN_SAMPLE = 5;

const COLORS = {
  positive: "var(--color-success)",
  neutral: "var(--color-warning)",
  negative: "var(--color-danger)",
};

function CardHeader() {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="section-label">Sentimento das conversas</p>
        </div>
        <p className="text-xs text-muted">Últimos 7 dias</p>
      </div>
    </header>
  );
}

function HeuristicBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
      Heurística · amostra insuficiente
    </span>
  );
}

export function SentimentOverview({ data }: SentimentOverviewProps) {
  if (data.total === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
        <CardHeader />
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle p-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-card">
            <MessageSquare className="h-5 w-5 text-muted" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">
              Nenhuma conversa analisada ainda
            </p>
            <p className="max-w-md text-xs leading-5 text-muted">
              Conecte o Evo CRM em Configurações pra começar a sincronizar conversas.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (data.total < SENTIMENT_MIN_SAMPLE) {
    const remaining = SENTIMENT_MIN_SAMPLE - data.total;
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
        <CardHeader />
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle p-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-card">
            <Hourglass className="h-5 w-5 text-muted" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">
              Coletando amostra: {data.total} de {SENTIMENT_MIN_SAMPLE} conversas analisadas
            </p>
            <p className="max-w-md text-xs leading-5 text-muted">
              {remaining === 1
                ? "Falta 1 conversa pra mostrar percentuais confiáveis."
                : `Faltam ${remaining} conversas pra mostrar percentuais confiáveis.`}
            </p>
          </div>
          <HeuristicBadge />
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
    <section className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
      <CardHeader />

      <div className="flex items-center gap-6">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-text">
              {data.total.toLocaleString("pt-BR")}
            </span>
            <span className="text-[10px] text-muted">total</span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-3">
          <LegendRow
            label="Positivo"
            value={data.positive}
            percent={positivePercent}
            color={COLORS.positive}
          />
          <LegendRow
            label="Neutro"
            value={data.neutral}
            percent={neutralPercent}
            color={COLORS.neutral}
          />
          <LegendRow
            label="Negativo"
            value={data.negative}
            percent={negativePercent}
            color={COLORS.negative}
          />
        </ul>
      </div>
    </section>
  );
}

function LegendRow({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-muted tabular-nums">
          {percent}% · {value} conv.
        </p>
      </div>
    </li>
  );
}
