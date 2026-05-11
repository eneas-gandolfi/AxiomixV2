/**
 * Arquivo: src/components/dashboard/niche-benchmark-card.tsx
 * Propósito: Card "Você vs nicho" — compara métricas do tenant atual com a
 *            média anônima de outros tenants do mesmo nicho.
 *
 *            v1: query a tabela `niche_aggregates` (populada pelo cron diário
 *            /api/cron/niche-aggregates). Se < 5 peers no nicho ou sem dado
 *            do próprio tenant, mostra estado vazio honesto.
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import { unstable_noStore as noStore } from "next/cache";
import { Users2, ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNicheBySlug, inferNicheSlug } from "@/lib/niches";
import { getNicheAggregates } from "@/lib/dashboard/niche-aggregates-cache";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
const MIN_OWN_INSIGHTS = 5;

type Direction = "better" | "worse" | "par";

type BenchmarkRow = {
  label: string;
  yourLabel: string;
  yourValue: number;
  nicheLabel: string;
  nicheValue: number;
  delta: { direction: Direction; label: string };
  /** Multiplicador pra largura visual (0..1) — usa o maior dos 2 como 100%. */
  yourBarWidthPct: number;
  nicheBarWidthPct: number;
  /** Se `higherIsBetter=false`, valores menores são "better" (ex: tempo). */
  higherIsBetter: boolean;
};

function classifyDelta(
  yourValue: number,
  nicheValue: number,
  higherIsBetter: boolean,
): { direction: Direction; label: string } {
  const diff = yourValue - nicheValue;
  if (Math.abs(diff) < 0.5) {
    return { direction: "par", label: "≈ par" };
  }
  const yourBetter = higherIsBetter ? diff > 0 : diff < 0;
  const sign = diff > 0 ? "+" : "";
  return {
    direction: yourBetter ? "better" : "worse",
    label: `${sign}${Math.round(diff * 10) / 10} pp`,
  };
}

function computeBars(your: number, peer: number) {
  const max = Math.max(your, peer, 1);
  return {
    yourBarWidthPct: Math.round((your / max) * 100),
    nicheBarWidthPct: Math.round((peer / max) * 100),
  };
}

export async function NicheBenchmarkCard({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();

  // 1) Niche slug do tenant
  const { data: company } = await supabase
    .from("companies")
    .select("name, niche_slug, niche")
    .eq("id", companyId)
    .maybeSingle();

  // Fallback: tenants antigos têm `niche` em texto livre mas niche_slug NULL.
  // Tenta inferir o slug a partir do texto (ex: "Loja de roupa" → "varejo").
  const nicheSlug = company?.niche_slug ?? inferNicheSlug(company?.niche);

  if (!nicheSlug) {
    return <EmptyState reason="no-niche" />;
  }

  // 2) Agregados do nicho (cacheados por 1h, invalidados pela tag quando
  //    o cron diario `/api/cron/niche-aggregates` termina). Usa admin client
  //    via helper porque a tabela tem RLS off (dado publico-agregado).
  const aggregates = await getNicheAggregates(nicheSlug);

  if (!aggregates || aggregates.peer_count < 5) {
    // Sem peers suficientes no nicho → não renderiza nada. O card vazio
    // ocupava espaço sem agregar valor (gestor não pode acelerar o
    // crescimento do SaaS). Volta automaticamente quando peer_count >= 5.
    return null;
  }

  // 3) Métricas do próprio tenant (mesmo cálculo do cron, só pra este tenant)
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
  const [totalResult, positiveResult, opportunityResult] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("generated_at", sinceIso),
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("sentiment", "positivo")
      .gte("generated_at", sinceIso),
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", sinceIso),
  ]);

  const totalCount = totalResult.count ?? 0;

  if (totalCount < MIN_OWN_INSIGHTS) {
    // Tenant ainda não tem volume próprio pra comparar honestamente. CTA
    // pra conectar WhatsApp já existe no estado vazio do dashboard.
    return null;
  }

  const ownSentimentPct = ((positiveResult.count ?? 0) / totalCount) * 100;
  const ownOpportunityPct = ((opportunityResult.count ?? 0) / totalCount) * 100;
  const ownWeeklyVolume = totalCount / (WINDOW_DAYS / 7);

  const rows: BenchmarkRow[] = [];

  if (aggregates.sentiment_positive_pct !== null) {
    const peer = Number(aggregates.sentiment_positive_pct);
    rows.push({
      label: "Sentimento positivo",
      yourLabel: `${Math.round(ownSentimentPct)}%`,
      yourValue: ownSentimentPct,
      nicheLabel: `${Math.round(peer)}%`,
      nicheValue: peer,
      delta: classifyDelta(ownSentimentPct, peer, true),
      ...computeBars(ownSentimentPct, peer),
      higherIsBetter: true,
    });
  }

  if (aggregates.opportunity_pct !== null) {
    const peer = Number(aggregates.opportunity_pct);
    rows.push({
      label: "Intenção de compra",
      yourLabel: `${Math.round(ownOpportunityPct)}%`,
      yourValue: ownOpportunityPct,
      nicheLabel: `${Math.round(peer)}%`,
      nicheValue: peer,
      delta: classifyDelta(ownOpportunityPct, peer, true),
      ...computeBars(ownOpportunityPct, peer),
      higherIsBetter: true,
    });
  }

  if (aggregates.avg_weekly_volume !== null) {
    const peer = Number(aggregates.avg_weekly_volume);
    rows.push({
      label: "Conversas / semana",
      yourLabel: `${Math.round(ownWeeklyVolume)}`,
      yourValue: ownWeeklyVolume,
      nicheLabel: `${Math.round(peer)}`,
      nicheValue: peer,
      delta: classifyDelta(ownWeeklyVolume, peer, true),
      ...computeBars(ownWeeklyVolume, peer),
      higherIsBetter: true,
    });
  }

  const niche = getNicheBySlug(nicheSlug);

  return (
    <section className="dashboard-panel rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Você vs nicho</p>
          <h2 className="mt-1 text-lg font-semibold text-text">
            {niche.label}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-card/50 border border-border/70 px-3 py-1 text-xs text-muted">
          <Users2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-mono">{aggregates.peer_count} peers</span>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-4">
        {rows.map((row) => (
          <BenchmarkRowItem key={row.label} row={row} />
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-light">
        Dado anônimo · agregado entre tenants do mesmo nicho · janela de{" "}
        {WINDOW_DAYS} dias.
      </p>
    </section>
  );
}

// =============================================================================
// Subcomponentes
// =============================================================================

function BenchmarkRowItem({ row }: { row: BenchmarkRow }) {
  const deltaColor =
    row.delta.direction === "better"
      ? "text-success bg-success-light"
      : row.delta.direction === "worse"
        ? "text-danger bg-danger-light"
        : "text-muted-light bg-card/40";

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-text">{row.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${deltaColor}`}
        >
          {row.delta.label}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[60px_1fr_60px] items-center gap-2">
        <span className="text-xs font-semibold text-[var(--module-accent,_#2EC4B6)] text-right">
          Você
        </span>
        <div className="h-2 rounded-full bg-card/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--module-accent,_#2EC4B6)]"
            style={{ width: `${row.yourBarWidthPct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-text">{row.yourLabel}</span>
      </div>

      <div className="mt-1 grid grid-cols-[60px_1fr_60px] items-center gap-2">
        <span className="text-xs text-muted text-right">Nicho</span>
        <div className="h-2 rounded-full bg-card/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-muted-light/60"
            style={{ width: `${row.nicheBarWidthPct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted">{row.nicheLabel}</span>
      </div>
    </li>
  );
}

function EmptyState({
  reason,
  nicheSlug,
}: {
  reason: "no-niche" | "not-enough-peers" | "not-enough-own-data";
  nicheSlug?: string;
}) {
  const nicheLabel = nicheSlug ? getNicheBySlug(nicheSlug).label : null;

  let title: string;
  let body: string;
  let cta: { href: string; label: string } | null = null;

  switch (reason) {
    case "no-niche":
      title = "Defina seu nicho pra ativar";
      body =
        "Atualize seu cadastro em Configurações pra escolher um nicho da lista curada e desbloquear o benchmark.";
      cta = { href: "/settings?tab=general", label: "Ir pra Configurações" };
      break;
    case "not-enough-peers":
      title = `Coletando dados do nicho ${nicheLabel ?? ""}`.trim();
      body =
        "Quando houver pelo menos 5 outros tenants do mesmo nicho com dados suficientes, mostraremos aqui o comparativo anônimo. Quanto mais peers entrarem, mais útil o benchmark fica.";
      break;
    case "not-enough-own-data":
      title = "Aguardando seus primeiros dados";
      body =
        "Conecte seu WhatsApp e analise pelo menos 5 conversas pra que possamos comparar você com o nicho.";
      cta = { href: "/whatsapp-intelligence", label: "Ir pra Inteligência" };
      break;
  }

  return (
    <section className="dashboard-panel rounded-[24px] p-5">
      <p className="section-label">Você vs nicho</p>
      <h2 className="mt-1 text-lg font-semibold text-text">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>

      {cta ? (
        <a
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          {cta.label}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </section>
  );
}
