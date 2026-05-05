/**
 * Arquivo: src/components/whatsapp/intent-distribution-chart.tsx
 * Propósito: Distribuição de intenções como barras horizontais.
 *            Substitui o donut anterior — Caravaggio's principle: humanos
 *            interpretam comprimentos muito mais rápido do que ângulos.
 *            Sortado por count desc, cor por intenção, click opcional.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  suporte: "var(--module-accent)",
  reclamacao: "var(--color-danger)",
  duvida: "var(--color-warning)",
  cancelamento: "var(--color-danger)",
  outro: "var(--color-muted-light)",
};

function getIntentColor(intent: string): string {
  return INTENT_COLORS[intent.toLowerCase()] ?? "var(--color-muted-light)";
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function IntentDistributionChart({
  data,
  onIntentClick,
}: IntentDistributionChartProps) {
  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Intenções</CardTitle>
          <CardDescription>Sem dados suficientes</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted">
            Quando houver conversas analisadas, a distribuição aparece aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Intenções</CardTitle>
        <CardDescription>{total} conversas analisadas</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3 py-2">
          {sorted.map((item) => {
            const percentage = total === 0 ? 0 : (item.value / total) * 100;
            const widthPct = max === 0 ? 0 : (item.value / max) * 100;
            const color = getIntentColor(item.name);
            const isClickable = Boolean(onIntentClick);

            return (
              <li key={item.name}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => onIntentClick?.(item.name)}
                  className={`block w-full text-left ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  } rounded-lg p-2 transition-colors ${
                    isClickable
                      ? "hover:bg-[var(--color-surface-2)]"
                      : ""
                  }`}
                >
                  <div className="grid grid-cols-[120px_1fr_60px_64px] items-center gap-3">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {capitalize(item.name)}
                    </span>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-right font-mono text-xs text-[var(--color-text)]">
                      {item.value}
                    </span>
                    <span
                      className="text-right font-mono text-xs font-semibold"
                      style={{ color }}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
