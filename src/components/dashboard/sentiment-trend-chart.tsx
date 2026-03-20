/**
 * Arquivo: src/components/dashboard/sentiment-trend-chart.tsx
 * Propósito: Gráfico de tendência de sentimento (7/14/30 dias) com seletor de período
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SentimentTrendDataPoint } from "@/types/modules/dashboard.types";

type DashboardSentimentTrendChartProps = {
  data: SentimentTrendDataPoint[];
};

type Period = "7d" | "14d" | "30d";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function DashboardSentimentTrendChart({ data }: DashboardSentimentTrendChartProps) {
  const [period, setPeriod] = useState<Period>("30d");

  const filteredData = useMemo(() => {
    const days = period === "7d" ? 7 : period === "14d" ? 14 : 30;
    return data.slice(-days);
  }, [data, period]);
  const totals = useMemo(
    () =>
      filteredData.reduce(
        (acc, item) => ({
          positivo: acc.positivo + item.positivo,
          neutro: acc.neutro + item.neutro,
          negativo: acc.negativo + item.negativo,
        }),
        { positivo: 0, neutro: 0, negativo: 0 }
      ),
    [filteredData]
  );

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
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

  const chartData = filteredData.map((item) => ({
    ...item,
    dateFormatted: formatDate(item.date),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-text">Tendência de sentimento</h3>
          </div>
          <p className="text-xs text-muted">Últimos {PERIOD_LABELS[period]}</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 rounded-lg bg-surface-subtle p-0.5">
          {(["7d", "14d", "30d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150",
                period === p
                  ? "bg-card text-text shadow-sm"
                  : "text-muted hover:text-text"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
          {totals.positivo} positivos
        </span>
        <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning">
          {totals.neutro} neutros
        </span>
        <span className="rounded-full bg-danger-light px-2.5 py-1 text-xs font-medium text-danger">
          {totals.negativo} negativos
        </span>
      </div>

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
            <filter id="shadow-line" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
            </filter>
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
          <Area type="monotone" dataKey="positivo" fill="url(#gradSuccess)" stroke="none" name="Positivo" legendType="none" />
          <Area type="monotone" dataKey="neutro" fill="url(#gradWarning)" stroke="none" name="Neutro" legendType="none" />
          <Area type="monotone" dataKey="negativo" fill="url(#gradDanger)" stroke="none" name="Negativo" legendType="none" />
          <Line
            type="monotone"
            dataKey="positivo"
            stroke="var(--color-success)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-success)" }}
            name="Positivo"
            filter="url(#shadow-line)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="neutro"
            stroke="var(--color-warning)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-warning)" }}
            name="Neutro"
            filter="url(#shadow-line)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="negativo"
            stroke="var(--color-danger)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: "var(--color-card)", stroke: "var(--color-danger)" }}
            name="Negativo"
            filter="url(#shadow-line)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
