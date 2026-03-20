/**
 * Arquivo: src/components/dashboard/content-performance-chart.tsx
 * Propósito: Gráfico de performance de conteúdo por plataforma com tooltip rico
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { ContentPerformanceDataPoint } from "@/types/modules/dashboard.types";

type ContentPerformanceChartProps = {
  data: ContentPerformanceDataPoint[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const published = payload.find((p) => p.name === "Publicados")?.value ?? 0;
  const failed = payload.find((p) => p.name === "Falhados")?.value ?? 0;
  const total = published + failed;
  const successRate = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-card-modern"
      style={{ borderColor: "var(--color-border)" }}
    >
      <p className="mb-1.5 text-sm font-semibold text-text">{label}</p>
      <div className="space-y-1 text-xs">
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
          <span className="text-muted">Publicados:</span>
          <span className="font-medium text-text">{published}</span>
        </p>
        {failed > 0 && (
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-danger)" }} />
            <span className="text-muted">Falhados:</span>
            <span className="font-medium text-danger">{failed}</span>
          </p>
        )}
        <div className="mt-1.5 border-t border-border pt-1.5">
          <p className="text-muted">
            Taxa de sucesso: <span className="font-medium text-text">{successRate}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContentPerformanceChart({ data }: ContentPerformanceChartProps) {
  const hasData = data.some((d) => d.published > 0 || d.failed > 0);
  const totals = data.reduce(
    (acc, item) => ({
      published: acc.published + item.published,
      failed: acc.failed + item.failed,
    }),
    { published: 0, failed: 0 }
  );
  const successRate =
    totals.published + totals.failed > 0
      ? Math.round((totals.published / (totals.published + totals.failed)) * 100)
      : 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-text">Performance por plataforma</h3>
      </div>
      <p className="mb-3 text-xs text-muted">Últimos 7 dias</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
          {totals.published} publicados
        </span>
        <span className="rounded-full bg-sidebar px-2.5 py-1 text-xs font-medium text-muted">
          {successRate}% de sucesso
        </span>
        {totals.failed > 0 ? (
          <span className="rounded-full bg-danger-light px-2.5 py-1 text-xs font-medium text-danger">
            {totals.failed} falhas
          </span>
        ) : null}
      </div>

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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-2)", opacity: 0.5 }} />
          <Bar
            dataKey="published"
            name="Publicados"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="failed"
            name="Falhados"
            fill="var(--color-danger)"
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
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
