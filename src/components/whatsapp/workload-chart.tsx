/**
 * Arquivo: src/components/whatsapp/workload-chart.tsx
 * Propósito: Gráfico de barras de distribuição de conversas por agente.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WorkloadItem = {
  name: string;
  count: number;
};

type WorkloadChartProps = {
  data: WorkloadItem[];
};

export function WorkloadChart({ data }: WorkloadChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (data.length === 0) {
    return (
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text">Distribuição de Carga</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Nenhum dado disponível.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-text">Distribuição de Carga</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-text">{item.name}</span>
              <span className="text-sm font-medium text-text">{item.count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-sidebar overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2EC4B6] transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
