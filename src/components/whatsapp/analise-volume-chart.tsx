/**
 * Arquivo: src/components/whatsapp/analise-volume-chart.tsx
 * Propósito: Gráfico de volume diário pra §3 da Análise — "Está vindo mais
 *            ou menos cliente que antes?". Single line + área, mostra total
 *            de insights por dia ao longo dos últimos 30 dias, com delta
 *            destacado nos extremos.
 *
 *            Substitui o uso anterior de SentimentTrendChart no §3 — aquela
 *            visualização (3 linhas por sentimento) responde outra pergunta
 *            e foi movida pra fora dessa seção.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DailyPoint = {
  date: string; // ISO yyyy-mm-dd
  count: number;
};

type AnaliseVolumeChartProps = {
  data: DailyPoint[];
  windowDays?: number;
};

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function AnaliseVolumeChart({
  data,
  windowDays = 30,
}: AnaliseVolumeChartProps) {
  if (data.length === 0 || data.every((p) => p.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume diário</CardTitle>
          <CardDescription>Sem dados suficientes</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted">
            Quando houver insights nos últimos {windowDays} dias, a curva
            aparece aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, p) => s + p.count, 0);
  const max = Math.max(...data.map((p) => p.count), 1);

  // Half-vs-half pra detectar se subiu ou caiu (proxy simples de tendência)
  const half = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, half).reduce((s, p) => s + p.count, 0);
  const secondHalf = data.slice(half).reduce((s, p) => s + p.count, 0);
  const trendDelta =
    firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : null;

  // Path SVG do polyline + área preenchida abaixo
  const W = 600;
  const H = 160;
  const padding = 8;
  const stepX = (W - 2 * padding) / Math.max(1, data.length - 1);

  const linePoints = data.map((p, i) => {
    const x = padding + i * stepX;
    const y = padding + (H - 2 * padding) * (1 - p.count / max);
    return [x, y] as const;
  });

  const linePath = linePoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L${linePoints[linePoints.length - 1][0].toFixed(1)},${(H - padding).toFixed(1)}` +
    ` L${linePoints[0][0].toFixed(1)},${(H - padding).toFixed(1)} Z`;

  const peak = data.reduce(
    (best, p) => (p.count > best.count ? p : best),
    data[0],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <CardTitle>Volume diário</CardTitle>
            <CardDescription>
              {total} insight{total === 1 ? "" : "s"} em {windowDays} dias · pico{" "}
              {peak.count} em {formatShortDate(peak.date)}
            </CardDescription>
          </div>
          {trendDelta !== null && Math.abs(trendDelta) >= 5 ? (
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                trendDelta > 0
                  ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                  : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              }`}
            >
              {trendDelta > 0 ? "+" : ""}
              {trendDelta}% vs metade anterior
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[180px] w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="volume-grad" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--module-accent, #2EC4B6)"
                  stopOpacity="0.32"
                />
                <stop
                  offset="100%"
                  stopColor="var(--module-accent, #2EC4B6)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Grid horizontal sutil */}
            <line
              x1={padding}
              y1={H * 0.33}
              x2={W - padding}
              y2={H * 0.33}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={padding}
              y1={H * 0.66}
              x2={W - padding}
              y2={H * 0.66}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Área preenchida */}
            <path d={areaPath} fill="url(#volume-grad)" />

            {/* Linha principal */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--module-accent, #2EC4B6)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Ponto final destacado */}
            {linePoints.length > 0 ? (
              <>
                <circle
                  cx={linePoints[linePoints.length - 1][0]}
                  cy={linePoints[linePoints.length - 1][1]}
                  r="9"
                  fill="var(--module-accent, #2EC4B6)"
                  fillOpacity="0.18"
                />
                <circle
                  cx={linePoints[linePoints.length - 1][0]}
                  cy={linePoints[linePoints.length - 1][1]}
                  r="4"
                  fill="var(--module-accent, #2EC4B6)"
                />
              </>
            ) : null}
          </svg>
        </div>

        {/* Eixo X: primeiro, meio, último */}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--color-text-tertiary)]">
          <span>{formatShortDate(data[0].date)}</span>
          <span>{formatShortDate(data[Math.floor(data.length / 2)].date)}</span>
          <span>agora</span>
        </div>
      </CardContent>
    </Card>
  );
}
