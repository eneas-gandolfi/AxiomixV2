/**
 * Arquivo: src/components/whatsapp/intent-distribution-chart.tsx
 * Propósito: Grafico de rosca mostrando distribuicao de intencoes.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type IntentDistributionData = {
  name: string;
  value: number;
  color: string;
};

type IntentDistributionChartProps = {
  data: IntentDistributionData[];
  onIntentClick?: (intent: string) => void;
};

const INTENT_COLORS: Record<string, string> = {
  compra: "var(--color-success)",
  suporte: "var(--color-primary)",
  reclamacao: "var(--color-danger)",
  duvida: "var(--color-warning)",
  cancelamento: "var(--color-danger)",
  outro: "var(--color-muted-light)",
};

function getIntentColor(intent: string): string {
  return INTENT_COLORS[intent.toLowerCase()] ?? "var(--color-muted-light)";
}

export function IntentDistributionChart({ data, onIntentClick }: IntentDistributionChartProps) {
  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Intenções</CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted">Sem dados suficientes para exibir o gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    color: getIntentColor(item.name),
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = (entry: { name: string; value: number; percent: number }) => {
    const percentage = ((entry.value / total) * 100).toFixed(0);
    return `${percentage}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Intenções</CardTitle>
        <CardDescription>{total} conversas analisadas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              onClick={(entry) => {
                if (onIntentClick) {
                  onIntentClick(entry.name);
                }
              }}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              formatter={(value: number) => [`${value} conversas`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value: string, entry: any) => {
                const count = entry.payload?.value ?? 0;
                return `${value.charAt(0).toUpperCase() + value.slice(1)} (${count})`;
              }}
              wrapperStyle={{ fontSize: "13px", color: "var(--color-text)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
