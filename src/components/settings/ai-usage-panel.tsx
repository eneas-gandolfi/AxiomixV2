/**
 * Arquivo: src/components/settings/ai-usage-panel.tsx
 * Propósito: Painel de uso e custos de IA — visível para owners e administradores.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Zap, TrendingUp, Cpu } from "lucide-react";
import type { UsageResponse } from "@/types/modules/usage.types";
import { MODULE_LABELS } from "@/types/modules/usage.types";

const MODULE_COLORS: Record<string, string> = {
  whatsapp: "var(--module-accent)",
  group_agent: "#25D366",
  rag: "#7C3AED",
  reports: "#D4A853",
  intelligence: "#D97706",
  social: "#FF6B6B",
  unknown: "#8A8A8A",
};

type Period = "7d" | "30d";

export function AiUsagePanel() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/usage?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[ai-usage] Falha ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(period);
  }, [period, fetchUsage]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">Uso & Custos de IA</h2>
          <p className="mt-0.5 text-sm text-muted">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">Uso & Custos de IA</h2>
          <p className="mt-0.5 text-sm text-muted">Nenhum dado disponível ainda.</p>
        </div>
      </div>
    );
  }

  const { summary, byModule, byModel, byDay } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Uso & Custos de IA</h2>
          <p className="mt-0.5 text-sm text-muted">
            Monitoramento de consumo de tokens e custos estimados
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setPeriod("7d")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === "7d"
                ? "bg-primary text-white"
                : "text-muted hover:text-text"
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === "30d"
                ? "bg-primary text-white"
                : "text-muted hover:text-text"
            }`}
          >
            30 dias
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Coins}
          label="Custo Total"
          value={`$${summary.total_cost_usd.toFixed(4)}`}
          subtitle="USD estimado"
        />
        <KpiCard
          icon={Zap}
          label="Total de Chamadas"
          value={summary.total_calls.toLocaleString("pt-BR")}
          subtitle="requisições à IA"
        />
        <KpiCard
          icon={TrendingUp}
          label="Tokens Totais"
          value={formatTokens(summary.total_tokens)}
          subtitle={`${formatTokens(summary.total_prompt_tokens)} input / ${formatTokens(summary.total_completion_tokens)} output`}
        />
        <KpiCard
          icon={Cpu}
          label="Modelos Usados"
          value={byModel.length.toString()}
          subtitle="modelos diferentes"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage over time */}
        <Card className="border border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm text-text">Custo por Dia (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            {byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => {
                      const [, m, day] = d.split("-");
                      return `${day}/${m}`;
                    }}
                    tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                    tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(6)}`, "Custo"]}
                    labelFormatter={(label: string) => {
                      const [y, m, d] = label.split("-");
                      return `${d}/${m}/${y}`;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_cost_usd"
                    stroke="var(--module-accent)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted py-12 text-center">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* By module */}
        <Card className="border border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm text-text">Custo por Módulo (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            {byModule.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byModule.map((m) => ({ ...m, label: MODULE_LABELS[m.module] ?? m.module }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted)" }}
                    tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                  />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(6)}`, "Custo"]} />
                  <Bar dataKey="total_cost_usd" radius={[4, 4, 0, 0]}>
                    {byModule.map((entry) => (
                      <Cell key={entry.module} fill={MODULE_COLORS[entry.module] ?? "#8A8A8A"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted py-12 text-center">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Models Table */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm text-text">Detalhamento por Modelo</CardTitle>
        </CardHeader>
        <CardContent>
          {byModel.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted font-medium">Modelo</th>
                    <th className="text-right py-2 px-3 text-muted font-medium">Chamadas</th>
                    <th className="text-right py-2 px-3 text-muted font-medium">Tokens</th>
                    <th className="text-right py-2 px-3 text-muted font-medium">Custo (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((m) => (
                    <tr key={m.model} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-3 text-text font-mono text-xs">{m.model}</td>
                      <td className="py-2 px-3 text-right text-text">{m.total_calls.toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-3 text-right text-text">{formatTokens(m.total_tokens)}</td>
                      <td className="py-2 px-3 text-right text-text font-medium">${m.total_cost_usd.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted py-4 text-center">Sem dados no período</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="border border-border rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted">{label}</p>
            <p className="text-xl font-semibold text-text">{value}</p>
            <p className="text-[10px] text-muted">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
