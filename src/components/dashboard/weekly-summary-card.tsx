/**
 * Arquivo: src/components/dashboard/weekly-summary-card.tsx
 * Propósito: Card "Resumo da última semana" — 3 fatos factuais sobre o que
 *            mudou nos últimos 7 dias vs os 7 anteriores. Heurística
 *            determinística (volume, sentimento, top intent shift).
 *            Mary's red line: descreve o "o quê", nunca o "porquê".
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import { unstable_noStore as noStore } from "next/cache";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Direction = "up" | "down" | "flat";

type Fact = {
  direction: Direction;
  delta: string; // já formatado (ex: "+18%", "−5pp", "—")
  label: string; // frase principal (ex: "Conversas analisadas subiram")
  sub?: string; // contexto opcional (ex: "142 esta semana · 120 anterior")
};

const DAY_MS = 86_400_000;
const MIN_INSIGHTS_FOR_SUMMARY = 5;

function classifyDirection(delta: number): Direction {
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "flat";
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function ppChange(currentPct: number, previousPct: number): number {
  return currentPct - previousPct;
}

export async function WeeklySummaryCard({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();

  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("sentiment, intent")
      .eq("company_id", companyId)
      .gte("generated_at", sevenDaysAgo),
    supabase
      .from("conversation_insights")
      .select("sentiment, intent")
      .eq("company_id", companyId)
      .gte("generated_at", fourteenDaysAgo)
      .lt("generated_at", sevenDaysAgo),
  ]);

  const currentRows = currentResult.data ?? [];
  const previousRows = previousResult.data ?? [];

  // Sem dado suficiente pra gerar fatos honestos — não renderiza nada.
  // Volta automaticamente quando o tenant acumular >= 5 conversas analisadas
  // na janela de 7 dias.
  if (currentRows.length < MIN_INSIGHTS_FOR_SUMMARY) {
    return null;
  }

  const facts: Fact[] = [];

  // Fato 1 — Volume de conversas analisadas
  const volumeDelta = pctChange(currentRows.length, previousRows.length);
  if (volumeDelta !== null && Math.abs(volumeDelta) >= 3) {
    const direction = classifyDirection(volumeDelta);
    facts.push({
      direction,
      delta: `${volumeDelta > 0 ? "+" : ""}${Math.round(volumeDelta)}%`,
      label:
        direction === "up"
          ? "Conversas analisadas subiram"
          : direction === "down"
            ? "Conversas analisadas caíram"
            : "Volume de conversas estável",
      sub: `${currentRows.length} esta semana · ${previousRows.length} anterior`,
    });
  }

  // Fato 2 — Sentimento positivo (delta em pontos percentuais)
  const positivosCurrent = currentRows.filter((r) => r.sentiment === "positivo").length;
  const positivosPrevious = previousRows.filter((r) => r.sentiment === "positivo").length;
  const pctCurrent = currentRows.length > 0 ? (positivosCurrent / currentRows.length) * 100 : 0;
  const pctPrevious = previousRows.length > 0 ? (positivosPrevious / previousRows.length) * 100 : 0;
  const sentimentDelta = ppChange(pctCurrent, pctPrevious);
  if (previousRows.length >= MIN_INSIGHTS_FOR_SUMMARY && Math.abs(sentimentDelta) >= 1) {
    const direction = classifyDirection(sentimentDelta);
    facts.push({
      direction,
      delta: `${sentimentDelta > 0 ? "+" : ""}${Math.round(sentimentDelta)}pp`,
      label:
        direction === "up"
          ? "Sentimento positivo subiu"
          : direction === "down"
            ? "Sentimento positivo caiu"
            : "Sentimento estável",
      sub: `${Math.round(pctCurrent)}% positivo agora · ${Math.round(pctPrevious)}% anterior`,
    });
  }

  // Fato 3 — Maior shift de intenção (cresceu OU caiu mais)
  const currentIntents = new Map<string, number>();
  const previousIntents = new Map<string, number>();
  for (const row of currentRows) {
    if (row.intent) currentIntents.set(row.intent, (currentIntents.get(row.intent) ?? 0) + 1);
  }
  for (const row of previousRows) {
    if (row.intent) previousIntents.set(row.intent, (previousIntents.get(row.intent) ?? 0) + 1);
  }

  const allIntents = new Set([...currentIntents.keys(), ...previousIntents.keys()]);
  let topIntentShift: { intent: string; delta: number } | null = null;
  for (const intent of allIntents) {
    const cur = currentIntents.get(intent) ?? 0;
    const prev = previousIntents.get(intent) ?? 0;
    const delta = pctChange(cur, prev);
    if (delta === null || cur < 3) continue;
    if (Math.abs(delta) < 10) continue;
    if (!topIntentShift || Math.abs(delta) > Math.abs(topIntentShift.delta)) {
      topIntentShift = { intent, delta };
    }
  }

  if (topIntentShift) {
    const direction = classifyDirection(topIntentShift.delta);
    facts.push({
      direction,
      delta: `${topIntentShift.delta > 0 ? "+" : ""}${Math.round(topIntentShift.delta)}%`,
      label:
        direction === "up"
          ? `Intenção "${topIntentShift.intent}" cresceu`
          : `Intenção "${topIntentShift.intent}" caiu`,
      sub: undefined,
    });
  }

  // Garantia: se nenhum fato foi gerado, mostra mensagem de "estável".
  if (facts.length === 0) {
    facts.push({
      direction: "flat",
      delta: "—",
      label: "Semana estável",
      sub: "Sem mudanças notáveis nos indicadores principais",
    });
  }

  return (
    <section className="dashboard-panel rounded-[24px] p-5">
      <p className="section-label">Resumo da última semana</p>
      <h2 className="mt-1 text-lg font-semibold text-text">
        O que mudou desde segunda
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {facts.map((fact, index) => (
          <FactRow key={index} fact={fact} />
        ))}
      </ul>
    </section>
  );
}

function FactRow({ fact }: { fact: Fact }) {
  const Icon =
    fact.direction === "up" ? TrendingUp : fact.direction === "down" ? TrendingDown : Minus;
  const color =
    fact.direction === "up"
      ? "text-success"
      : fact.direction === "down"
        ? "text-danger"
        : "text-muted-light";

  return (
    <li className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span
        className={`flex items-center gap-1 font-mono text-xs font-bold ${color} flex-shrink-0 w-16`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {fact.delta}
      </span>
      <div className="flex-1 text-sm text-text">
        <p className="font-medium">{fact.label}</p>
        {fact.sub ? (
          <p className="mt-0.5 text-xs text-muted-light italic">{fact.sub}</p>
        ) : null}
      </div>
    </li>
  );
}
