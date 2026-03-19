/**
 * Arquivo: src/components/whatsapp/batch-sentiment-bar-chart.tsx
 * Propósito: Gráfico de barras para distribuição de sentimento na análise em lote.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type SentimentBarData = {
  name: string;
  value: number;
  color: string;
};

type BatchSentimentBarChartProps = {
  data: SentimentBarData[];
};

const SENTIMENT_COLORS: Record<string, string> = {
  Positivo: "var(--color-success)",
  Neutro: "var(--color-warning)",
  Negativo: "var(--color-danger)",
};

export function BatchSentimentBarChart({ data }: BatchSentimentBarChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Sentimento</CardTitle>
          <CardDescription>Análise em lote</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted">Sem dados de sentimento disponíveis.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    color: SENTIMENT_COLORS[item.name] ?? "var(--color-muted-light)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Sentimento</CardTitle>
        <CardDescription>{total} conversas analisadas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: "var(--color-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--color-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              formatter={(value: number) => [`${value} conversas`, ""]}
              cursor={{ fill: "var(--color-surface-2)", opacity: 0.5 }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
