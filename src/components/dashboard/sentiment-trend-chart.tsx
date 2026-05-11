/**
 * Arquivo: src/components/dashboard/sentiment-trend-chart.tsx
 * Propósito: Tendência de sentimento (7/14/30 dias) com seletor de período.
 *            Regra rígida (Sally's red line): só renderiza o gráfico com
 *            >= MIN_DAYS_WITH_DATA dias contendo dado real (positivo+neutro+
 *            negativo > 0). Abaixo disso, substitui o gráfico por estado
 *            calibrando honesto — "coletando amostra: X de N dias" — pra
 *            não exibir gráfico-cemitério com 2 pontos isolados.
 * Autor: AXIOMIX
 * Data: 2026-05-11
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
import { Hourglass, TrendingUp } from "lucide-react";
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

const PERIOD_DAYS: Record<Period, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

/** Mínimo de dias com dado real (positivo+neutro+negativo > 0) pra renderizar
 *  o gráfico. Abaixo disso, mostra estado calibrando. Sally's red line:
 *  gráfico com 2 pontos em 30 dias é pior que estado vazio. */
const MIN_DAYS_WITH_DATA = 7;

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function hasData(point: SentimentTrendDataPoint): boolean {
  return point.positivo + point.neutro + point.negativo > 0;
}

export function DashboardSentimentTrendChart({ data }: DashboardSentimentTrendChartProps) {
  const [period, setPeriod] = useState<Period>("30d");

  const filteredData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    return data.slice(-days);
  }, [data, period]);

  const daysWithData = useMemo(
    () => filteredData.filter(hasData).length,
    [filteredData],
  );

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

  const totalDays = PERIOD_DAYS[period];
  const isCalibrating = daysWithData < MIN_DAYS_WITH_DATA;
  const daysRemaining = Math.max(MIN_DAYS_WITH_DATA - daysWithData, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="section-label">Tendência de sentimento</p>
          </div>
          <p className="text-xs text-muted">Últimos {PERIOD_LABELS[period]}</p>
        </div>

        <div className="flex gap-1 rounded-lg bg-surface-subtle p-0.5">
          {(["7d", "14d", "30d"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
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

      {isCalibrating ? (
        <CalibratingState
          daysWithData={daysWithData}
          totalDays={totalDays}
          daysRemaining={daysRemaining}
        />
      ) : (
        <>
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

          <SentimentChart data={filteredData} />
        </>
      )}
    </div>
  );
}

function CalibratingState({
  daysWithData,
  totalDays,
  daysRemaining,
}: {
  daysWithData: number;
  totalDays: number;
  daysRemaining: number;
}) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-subtle p-6 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-card">
        <Hourglass className="h-5 w-5 text-muted" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text">
          Coletando amostra: {daysWithData} de {totalDays} dias com dados
        </p>
        <p className="max-w-md text-xs leading-5 text-muted">
          {daysRemaining > 0
            ? `Faltam ~${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"} pra mostrar tendência confiável. Seu painel vai amadurecer com o uso.`
            : "Em breve a tendência aparece aqui."}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
        Heurística · amostra insuficiente
      </span>
    </div>
  );
}

function SentimentChart({ data }: { data: SentimentTrendDataPoint[] }) {
  const chartData = data.map((item) => ({
    ...item,
    dateFormatted: formatDate(item.date),
  }));

  return (
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
  );
}
