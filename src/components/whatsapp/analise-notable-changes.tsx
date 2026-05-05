/**
 * Arquivo: src/components/whatsapp/analise-notable-changes.tsx
 * Propósito: Strip de 3 cards no topo da aba Análise — "Mudanças notáveis na
 *            última semana". Heurística determinística (volume, top intent,
 *            sentimento ou pendentes) — descreve o "o quê", nunca o "porquê"
 *            (Mary's red line).
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

type Direction = "up" | "down" | "flat" | "neutral";
type Fact = {
  direction: Direction;
  label: string;
  text: string;
};

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function AnaliseNotableChanges({ companyId }: { companyId: string }) {
  const supabase = await createSupabaseServerClient();

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();

  const [currentResult, previousResult, totalResult, pendingResult] = await Promise.all([
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
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("conversation_insights")
      .select("conversation_id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  const currentRows = currentResult.data ?? [];
  const previousRows = previousResult.data ?? [];
  const totalConversations = totalResult.count ?? 0;
  const totalAnalyzed = pendingResult.count ?? 0;
  const pendingCount = Math.max(0, totalConversations - totalAnalyzed);

  const facts: Fact[] = [];

  // Fato 1 — Volume de conversas analisadas
  const volumeDelta = pctChange(currentRows.length, previousRows.length);
  if (volumeDelta !== null && Math.abs(volumeDelta) >= 5) {
    facts.push({
      direction: volumeDelta > 0 ? "up" : "down",
      label: `${volumeDelta > 0 ? "+" : ""}${volumeDelta}%`,
      text:
        volumeDelta > 0
          ? "Volume de conversas analisadas subiu"
          : "Volume de conversas analisadas caiu",
    });
  }

  // Fato 2 — Top intent shift
  const currentIntents = new Map<string, number>();
  const previousIntents = new Map<string, number>();
  for (const row of currentRows) {
    if (row.intent) currentIntents.set(row.intent, (currentIntents.get(row.intent) ?? 0) + 1);
  }
  for (const row of previousRows) {
    if (row.intent) previousIntents.set(row.intent, (previousIntents.get(row.intent) ?? 0) + 1);
  }

  let topShift: { intent: string; delta: number } | null = null;
  for (const intent of new Set([...currentIntents.keys(), ...previousIntents.keys()])) {
    const cur = currentIntents.get(intent) ?? 0;
    const prev = previousIntents.get(intent) ?? 0;
    if (cur < 3) continue;
    const delta = pctChange(cur, prev);
    if (delta === null || Math.abs(delta) < 15) continue;
    if (!topShift || Math.abs(delta) > Math.abs(topShift.delta)) {
      topShift = { intent, delta };
    }
  }

  if (topShift) {
    facts.push({
      direction: topShift.delta > 0 ? "up" : "down",
      label: `${topShift.delta > 0 ? "+" : ""}${topShift.delta}%`,
      text: `Intenção "${topShift.intent}" ${topShift.delta > 0 ? "cresceu" : "caiu"} vs semana anterior`,
    });
  }

  // Fato 3 — Conversas pendentes de análise (CTA)
  if (pendingCount > 0) {
    facts.push({
      direction: "neutral",
      label: `${pendingCount}`,
      text: `${pendingCount} conversa${pendingCount === 1 ? "" : "s"} ainda sem análise de IA`,
    });
  }

  // Fallback: semana estável
  if (facts.length === 0) {
    facts.push({
      direction: "flat",
      label: "—",
      text: "Semana estável · sem mudanças notáveis nos indicadores",
    });
  }

  return (
    <section>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D4A853]">
        Mudanças notáveis · últimos 7 dias
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {facts.slice(0, 3).map((fact, index) => (
          <FactCard key={index} fact={fact} />
        ))}
      </div>
    </section>
  );
}

function FactCard({ fact }: { fact: Fact }) {
  const Icon =
    fact.direction === "up"
      ? TrendingUp
      : fact.direction === "down"
        ? TrendingDown
        : fact.direction === "neutral"
          ? Sparkles
          : Minus;

  const borderClass =
    fact.direction === "up"
      ? "border-[var(--color-success)]/30"
      : fact.direction === "down"
        ? "border-[var(--color-danger)]/30"
        : fact.direction === "neutral"
          ? "border-[#D4A853]/30"
          : "border-[var(--color-border)]";

  const labelColor =
    fact.direction === "up"
      ? "text-[var(--color-success)]"
      : fact.direction === "down"
        ? "text-[var(--color-danger)]"
        : fact.direction === "neutral"
          ? "text-[#D4A853]"
          : "text-[var(--color-text-tertiary)]";

  return (
    <article
      className={`rounded-xl border ${borderClass} bg-[var(--color-surface)] p-4`}
    >
      <div className={`flex items-center gap-2 font-mono text-xs font-bold ${labelColor}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{fact.label}</span>
      </div>
      <p className="mt-2 text-sm leading-snug text-[var(--color-text)]">
        {fact.text}
      </p>
    </article>
  );
}
