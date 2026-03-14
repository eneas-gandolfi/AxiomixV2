/**
 * Arquivo: src/components/whatsapp/sentiment-trend-chart.tsx
 * Proposito: Grafico de linha mostrando evolucao do sentimento ao longo do tempo.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type SentimentTrendData = {
  date: string;
  positivo: number;
  neutro: number;
  negativo: number;
};

type SentimentTrendChartProps = {
  data: SentimentTrendData[];
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function SentimentTrendChart({ data }: SentimentTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sentimento</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted">Sem dados suficientes para exibir o gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    dateFormatted: formatDate(item.date),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Sentimento</CardTitle>
        <CardDescription>Evolução dos últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              stroke="var(--color-border)"
            />
            <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} stroke="var(--color-border)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              labelStyle={{ color: "var(--color-text)", fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "14px", color: "var(--color-text)" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="positivo"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={{ fill: "var(--color-success)", r: 3 }}
              activeDot={{ r: 5 }}
              name="Positivo"
            />
            <Line
              type="monotone"
              dataKey="neutro"
              stroke="var(--color-warning)"
              strokeWidth={2}
              dot={{ fill: "var(--color-warning)", r: 3 }}
              activeDot={{ r: 5 }}
              name="Neutro"
            />
            <Line
              type="monotone"
              dataKey="negativo"
              stroke="var(--color-danger)"
              strokeWidth={2}
              dot={{ fill: "var(--color-danger)", r: 3 }}
              activeDot={{ r: 5 }}
              name="Negativo"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
