/**
 * Arquivo: src/components/dashboard/content-performance-chart.tsx
 * Propósito: Gráfico de performance de conteúdo por plataforma (últimos 7 dias)
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { ContentPerformanceDataPoint } from "@/types/modules/dashboard.types";

type ContentPerformanceChartProps = {
  data: ContentPerformanceDataPoint[];
};

export function ContentPerformanceChart({ data }: ContentPerformanceChartProps) {
  const hasData = data.some((d) => d.published > 0 || d.failed > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Performance por plataforma</h3>
        </div>
        <p className="mb-3 text-xs text-muted">Últimos 7 dias</p>
        <div className="flex h-[140px] flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sidebar">
            <BarChart3 className="h-5 w-5 text-muted-light" aria-hidden="true" />
          </span>
          <p className="max-w-xs text-center text-sm text-muted">
            Nenhum post publicado nos últimos 7 dias. Crie conteúdo no Social Publisher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-text">Performance por plataforma</h3>
      </div>
      <p className="mb-3 text-xs text-muted">Últimos 7 dias</p>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="platformLabel"
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
            wrapperStyle={{ fontSize: "13px", color: "var(--color-text)" }}
            iconType="square"
          />
          <Bar
            dataKey="published"
            name="Publicados"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="failed"
            name="Falhados"
            fill="var(--color-danger)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-3 flex gap-4 rounded-lg bg-surface-subtle px-3 py-2">
        {data.map((item) => (
          <div key={item.platform} className="flex items-center gap-2 text-xs text-muted">
            <span className="font-medium text-text">{item.platformLabel}</span>
            <span>{item.published} pub.</span>
            {item.failed > 0 && (
              <span className="rounded bg-danger-light px-1.5 py-0.5 text-danger">
                {item.failed} falha{item.failed !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
