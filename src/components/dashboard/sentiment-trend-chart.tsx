/**
 * Arquivo: src/components/dashboard/sentiment-trend-chart.tsx
 * Propósito: Gráfico de tendência de sentimento (30 dias) para o dashboard
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { SentimentTrendDataPoint } from "@/types/modules/dashboard.types";

type DashboardSentimentTrendChartProps = {
  data: SentimentTrendDataPoint[];
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function DashboardSentimentTrendChart({ data }: DashboardSentimentTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Tendência de sentimento</h3>
        </div>
        <p className="mb-3 text-xs text-muted">Últimos 30 dias</p>
        <div className="flex h-[140px] flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sidebar">
            <TrendingUp className="h-5 w-5 text-muted-light" aria-hidden="true" />
          </span>
          <p className="max-w-xs text-center text-sm text-muted">
            Sem dados de sentimento para exibir. Analise conversas no WhatsApp Intelligence para
            gerar dados.
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    dateFormatted: formatDate(item.date),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-text">Tendência de sentimento</h3>
      </div>
      <p className="mb-3 text-xs text-muted">Últimos 30 dias</p>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWarning" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradDanger" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="dateFormatted"
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "14px",
              boxShadow: "0 4px 16px rgba(28,25,23,0.08)",
            }}
            labelStyle={{ color: "var(--color-text)", fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: "14px", color: "var(--color-text)" }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="positivo"
            fill="url(#gradSuccess)"
            stroke="none"
            name="Positivo"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="neutro"
            fill="url(#gradWarning)"
            stroke="none"
            name="Neutro"
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="negativo"
            fill="url(#gradDanger)"
            stroke="none"
            name="Negativo"
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="positivo"
            stroke="var(--color-success)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-success)" }}
            name="Positivo"
          />
          <Line
            type="monotone"
            dataKey="neutro"
            stroke="var(--color-warning)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-warning)" }}
            name="Neutro"
          />
          <Line
            type="monotone"
            dataKey="negativo"
            stroke="var(--color-danger)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-danger)" }}
            name="Negativo"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
