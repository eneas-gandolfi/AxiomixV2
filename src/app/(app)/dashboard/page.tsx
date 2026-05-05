/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard - hub de inteligência de negócio.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { Suspense, type CSSProperties } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { Database } from "@/database/types/database.types";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { HeroMetric } from "@/components/dashboard/hero-metric";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { RetryDashboardButton } from "@/components/dashboard/retry-dashboard-button";
import { DashboardChartsSection } from "@/components/dashboard/dashboard-charts-section";
import { DashboardSidebarSection } from "@/components/dashboard/dashboard-sidebar-section";
import { WeeklySummaryCard } from "@/components/dashboard/weekly-summary-card";
import { NicheBenchmarkCard } from "@/components/dashboard/niche-benchmark-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markStaleJobsFailed } from "@/lib/jobs/queue";
import { getNicheBySlug, isValidNicheSlug } from "@/lib/niches";
import { selectStalledConversations } from "@/lib/dashboard/selectors/stalledConversations";
import { createDefaultInsightRegistry } from "@/lib/dashboard/insights/defaultRegistry";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

const DAY_MS = 86_400_000;

function getVariation(currentValue: number, previousValue: number) {
  if (previousValue === 0) return null;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function getGreeting(): string {
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hour = brTime.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function buildDailyCountsFromDates(dates: string[], daysBack = 7): number[] {
  const counts: number[] = new Array(daysBack).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - d.getTime()) / DAY_MS);
    if (diffDays >= 0 && diffDays < daysBack) {
      counts[daysBack - 1 - diffDays]++;
    }
  }

  return counts;
}

function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex h-[280px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-48 rounded" />
        <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex h-[260px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
          <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-40 rounded" />
          <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
        </div>
        <div className="flex h-[260px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
          <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-40 rounded" />
          <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
        </div>
      </div>
      <div className="flex h-[220px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-48 rounded" />
        <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-5 w-40 rounded" />
        <div className="skeleton-shimmer animate-shimmer h-16 w-full rounded-lg" />
      </div>
      <div className="flex h-[200px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-36 rounded" />
        <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
      </div>
      <div className="flex h-[240px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
        <div className="skeleton-shimmer animate-shimmer mb-4 h-5 w-36 rounded" />
        <div className="skeleton-shimmer animate-shimmer min-h-0 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

function DashboardCardSkeleton() {
  return (
    <div className="dashboard-panel rounded-[24px] p-5">
      <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-32 rounded" />
      <div className="skeleton-shimmer animate-shimmer mb-4 h-6 w-48 rounded" />
      <div className="skeleton-shimmer animate-shimmer h-24 w-full rounded-lg" />
    </div>
  );
}

/**
 * Componente principal: busca header + metrics (queries rapidas de contagem).
 * Charts e sidebar carregam independentemente via Suspense.
 */
async function DashboardContent() {
  noStore();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error("Erro ao carregar dados. Tente novamente.");
  }

  if (!membership?.company_id) {
    redirect("/onboarding");
  }

  const companyId = membership.company_id;
  const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
  const greeting = getGreeting();

  const { data: companyRow } = await supabase
    .from("companies")
    .select("name, niche_slug")
    .eq("id", companyId)
    .single();
  const companyName = companyRow?.name ?? null;
  const nicheSlug = isValidNicheSlug(companyRow?.niche_slug)
    ? companyRow.niche_slug
    : "outro";
  const niche = getNicheBySlug(nicheSlug);

  // Fire-and-forget: nao bloquear rendering enquanto marca jobs stale
  void markStaleJobsFailed(companyId);

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    const fourteenDaysAgoIso = new Date(now.getTime() - 14 * DAY_MS).toISOString();

    // Selector "Conversas paradas" — espelho 1:1 da Operação. Roda em paralelo
    // com as queries de KPIs analíticos abaixo pra não bloquear streaming.
    const stalledPromise = selectStalledConversations(supabase, companyId);

    // Queries rapidas: contagens e sparklines para os 2 KPIs analíticos
    // que sobraram (Conversas analisadas + Oportunidades). Posts/virais
    // saíram da home — features ainda em "Em breve" no sidebar.
    const [
      conversationsCurrentResult,
      conversationsPreviousResult,
      opportunitiesCurrentResult,
      opportunitiesPreviousResult,
      conversationDatesResult,
      opportunityDatesResult,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", sevenDaysAgoIso)
        .lte("last_message_at", nowIso),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", fourteenDaysAgoIso)
        .lt("last_message_at", sevenDaysAgoIso),
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", sevenDaysAgoIso)
        .lte("generated_at", nowIso),
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", fourteenDaysAgoIso)
        .lt("generated_at", sevenDaysAgoIso),
      supabase
        .from("conversations")
        .select("last_message_at")
        .eq("company_id", companyId)
        .gte("last_message_at", sevenDaysAgoIso)
        .lte("last_message_at", nowIso),
      supabase
        .from("conversation_insights")
        .select("generated_at")
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", sevenDaysAgoIso)
        .lte("generated_at", nowIso),
    ]);

    const queryErrors = [
      conversationsCurrentResult.error,
      conversationsPreviousResult.error,
      opportunitiesCurrentResult.error,
      opportunitiesPreviousResult.error,
      conversationDatesResult.error,
      opportunityDatesResult.error,
    ];

    if (queryErrors.some((queryError) => queryError)) {
      throw new Error("Erro ao carregar dados. Tente novamente.");
    }

    const conversationsCurrent = conversationsCurrentResult.count ?? 0;
    const conversationsPrevious = conversationsPreviousResult.count ?? 0;
    const opportunitiesCurrent = opportunitiesCurrentResult.count ?? 0;
    const opportunitiesPrevious = opportunitiesPreviousResult.count ?? 0;

    const conversationSparkData = buildDailyCountsFromDates(
      (conversationDatesResult.data ?? []).map((d) => d.last_message_at).filter(Boolean) as string[]
    );
    const opportunitySparkData = buildDailyCountsFromDates(
      (opportunityDatesResult.data ?? []).map((d) => d.generated_at).filter(Boolean) as string[]
    );

    // Conversas paradas + insights determinísticos
    const stalled = await stalledPromise;
    const insights = createDefaultInsightRegistry().run({
      nicheSlug,
      stalled,
    });

    return (
      <main
        className="dashboard-stage mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8"
        style={{ "--module-color": "var(--color-primary)", "--module-color-bg": "var(--color-primary-dim)" } as CSSProperties}
      >
        <section className="dashboard-mesh overflow-hidden rounded-[28px] border border-border/70 p-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="section-label rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
              Dashboard executivo
            </span>
          </div>
          <h1 className="ax-t1 sm:text-4xl">
            {greeting}
            {companyName ? `, ${companyName}` : ""}.
          </h1>

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,340px)] xl:items-stretch">
            <HeroMetric
              count={stalled.count}
              label={niche.vocabulary.heroMetricLabel}
              customerNoun={{
                singular: niche.vocabulary.customerSingular,
                plural: niche.vocabulary.customerPlural,
              }}
              thresholdSeconds={stalled.amberSeconds}
              ctaHref="/whatsapp-intelligence?tab=operacao"
              topItems={stalled.items}
            />
            <InsightsPanel insights={insights} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <section className="relative">
              <div className="dot-pattern-bg pointer-events-none absolute inset-0 rounded-[24px] opacity-30" />
              <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Conversas analisadas"
                  value={conversationsCurrent}
                  icon="message-square"
                  sublabel="últimos 7 dias"
                  change={getVariation(conversationsCurrent, conversationsPrevious)}
                  emptyMessage="Primeiros dados desta semana"
                  ctaLabel="Ver conversas"
                  ctaHref="/whatsapp-intelligence"
                  emptyHint={
                    conversationsCurrent === 0
                      ? "Conecte o Evo CRM em Configurações para começar a sincronizar conversas."
                      : undefined
                  }
                  variant="hero"
                  sparkData={conversationSparkData}
                  animationDelay="delay-100"
                />
                <MetricCard
                  label="Oportunidades de venda"
                  value={opportunitiesCurrent}
                  icon="shopping-cart"
                  sublabel="intenção de compra detectada"
                  change={getVariation(opportunitiesCurrent, opportunitiesPrevious)}
                  emptyMessage="Nenhuma intenção de compra detectada ainda"
                  ctaLabel="Ver oportunidades"
                  ctaHref="/whatsapp-intelligence?filter=compra"
                  sparkData={opportunitySparkData}
                  animationDelay="delay-200"
                />
              </div>
            </section>

            {/* Resumo da semana + Benchmark vs nicho — fatos factuais e
                comparação com peers anônimos do mesmo nicho. */}
            <section className="grid gap-4 md:grid-cols-2">
              <Suspense fallback={<DashboardCardSkeleton />}>
                <WeeklySummaryCard companyId={companyId} />
              </Suspense>
              <Suspense fallback={<DashboardCardSkeleton />}>
                <NicheBenchmarkCard companyId={companyId} />
              </Suspense>
            </section>

            {/* Charts carregam independentemente via Suspense */}
            <Suspense fallback={<ChartsSkeleton />}>
              <DashboardChartsSection companyId={companyId} />
            </Suspense>
          </div>

          {/* Sidebar carrega independentemente via Suspense */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Suspense fallback={<SidebarSkeleton />}>
              <DashboardSidebarSection companyId={companyId} isOwnerOrAdmin={isOwnerOrAdmin} />
            </Suspense>
          </aside>
        </section>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 md:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Visão geral do seu negócio: vendas, sentimento e marketing.
          </p>
        </header>

        <section className="rounded-xl border border-danger bg-danger-light p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" aria-label="Erro ao carregar dados" />
            <h2 className="text-sm font-medium text-text">Erro ao carregar dados</h2>
          </div>
          <p className="mb-4 text-sm text-muted">Erro ao carregar dados. Tente novamente.</p>
          <RetryDashboardButton />
        </section>
      </main>
    );
  }
}

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
