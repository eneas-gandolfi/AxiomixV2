/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard - hub de inteligência de negócio.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Database, Json } from "@/database/types/database.types";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RetryDashboardButton } from "@/components/dashboard/retry-dashboard-button";
import { DashboardChartsSection } from "@/components/dashboard/dashboard-charts-section";
import { DashboardSidebarSection } from "@/components/dashboard/dashboard-sidebar-section";
import { Button } from "@/components/ui/button";
import { DecisionAxis } from "@/components/ui/decision-axis";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markStaleJobsFailed } from "@/lib/jobs/queue";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

const DAY_MS = 86_400_000;

function getVariation(currentValue: number, previousValue: number) {
  if (previousValue === 0) return null;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) return [] as string[];
  return rawPlatforms
    .map((platform) => (typeof platform === "string" ? platform : null))
    .filter((platform): platform is string => Boolean(platform));
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
    .select("name")
    .eq("id", companyId)
    .single();
  const companyName = companyRow?.name ?? null;

  // Fire-and-forget: nao bloquear rendering enquanto marca jobs stale
  void markStaleJobsFailed(companyId);

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    const fourteenDaysAgoIso = new Date(now.getTime() - 14 * DAY_MS).toISOString();

    // Queries rapidas: contagens e sparklines para header + metrics
    const [
      conversationsCurrentResult,
      conversationsPreviousResult,
      opportunitiesCurrentResult,
      opportunitiesPreviousResult,
      postsPublishedCurrentResult,
      postsPublishedPreviousResult,
      failedPostsResult,
      viralCurrentResult,
      viralPreviousResult,
      conversationDatesResult,
      opportunityDatesResult,
      postDatesResult,
      viralDatesResult,
      latestInsightResult,
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
        .from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "published")
        .gte("published_at", sevenDaysAgoIso)
        .lte("published_at", nowIso),
      supabase
        .from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "published")
        .gte("published_at", fourteenDaysAgoIso)
        .lt("published_at", sevenDaysAgoIso),
      supabase
        .from("scheduled_posts")
        .select("id, platforms, created_at")
        .eq("company_id", companyId)
        .eq("status", "failed")
        .gte("created_at", sevenDaysAgoIso)
        .lte("created_at", nowIso),
      supabase
        .from("collected_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("engagement_score", 300)
        .gte("collected_at", sevenDaysAgoIso)
        .lte("collected_at", nowIso),
      supabase
        .from("collected_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("engagement_score", 300)
        .gte("collected_at", fourteenDaysAgoIso)
        .lt("collected_at", sevenDaysAgoIso),
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
      supabase
        .from("scheduled_posts")
        .select("published_at")
        .eq("company_id", companyId)
        .eq("status", "published")
        .gte("published_at", sevenDaysAgoIso)
        .lte("published_at", nowIso),
      supabase
        .from("collected_posts")
        .select("collected_at")
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("engagement_score", 300)
        .gte("collected_at", sevenDaysAgoIso)
        .lte("collected_at", nowIso),
      supabase
        .from("intelligence_insights")
        .select("top_themes, recommendations, generated_at")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const queryErrors = [
      conversationsCurrentResult.error,
      conversationsPreviousResult.error,
      opportunitiesCurrentResult.error,
      opportunitiesPreviousResult.error,
      postsPublishedCurrentResult.error,
      postsPublishedPreviousResult.error,
      failedPostsResult.error,
      viralCurrentResult.error,
      viralPreviousResult.error,
      conversationDatesResult.error,
      opportunityDatesResult.error,
      postDatesResult.error,
      viralDatesResult.error,
      latestInsightResult.error,
    ];

    if (queryErrors.some((queryError) => queryError)) {
      throw new Error("Erro ao carregar dados. Tente novamente.");
    }

    const conversationsCurrent = conversationsCurrentResult.count ?? 0;
    const conversationsPrevious = conversationsPreviousResult.count ?? 0;
    const opportunitiesCurrent = opportunitiesCurrentResult.count ?? 0;
    const opportunitiesPrevious = opportunitiesPreviousResult.count ?? 0;
    const postsPublishedCurrent = postsPublishedCurrentResult.count ?? 0;
    const postsPublishedPrevious = postsPublishedPreviousResult.count ?? 0;
    const viralCurrent = viralCurrentResult.count ?? 0;
    const viralPrevious = viralPreviousResult.count ?? 0;

    const failedPosts = failedPostsResult.data ?? [];
    const failedPostsCount = failedPosts.length;

    const conversationSparkData = buildDailyCountsFromDates(
      (conversationDatesResult.data ?? []).map((d) => d.last_message_at).filter(Boolean) as string[]
    );
    const opportunitySparkData = buildDailyCountsFromDates(
      (opportunityDatesResult.data ?? []).map((d) => d.generated_at).filter(Boolean) as string[]
    );
    const postSparkData = buildDailyCountsFromDates(
      (postDatesResult.data ?? []).map((d) => d.published_at).filter(Boolean) as string[]
    );
    const viralSparkData = buildDailyCountsFromDates(
      (viralDatesResult.data ?? []).map((d) => d.collected_at).filter(Boolean) as string[]
    );

    const latestInsight = latestInsightResult.data;
    const recommendations: string[] = Array.isArray(latestInsight?.recommendations)
      ? (latestInsight.recommendations as string[]).slice(0, 3)
      : [];
    const aiSummary = recommendations[0] ?? null;

    const executiveSummary =
      opportunitiesCurrent > 0
        ? `${opportunitiesCurrent} oportunidades com intenção de compra surgiram na última semana. O momento é bom para acelerar resposta comercial.`
        : postsPublishedCurrent > 0
          ? `${postsPublishedCurrent} posts já saíram e o radar encontrou ${viralCurrent} sinais virais. Há lastro suficiente para decidir os próximos experimentos.`
          : "Conecte integrações e alimente os módulos para transformar o dashboard em uma camada de decisão, não apenas de status.";

    return (
      <main
        className="dashboard-stage mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8"
        style={{ "--module-color": "var(--color-primary)", "--module-color-bg": "var(--color-primary-dim)" } as CSSProperties}
      >
        <section className="dashboard-mesh overflow-hidden rounded-[28px] border border-border/70 p-5 sm:p-6 lg:p-7">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,340px)] xl:items-stretch">
            <div className="relative z-[1] flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-label rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
                  Dashboard executivo
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="ax-t1 sm:text-4xl">
                  {greeting}
                  {companyName ? `, ${companyName}` : ""}.
                </h1>
                <p className="mt-3 max-w-2xl ax-body text-[var(--color-text-secondary)]">
                  {executiveSummary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="ax-kpi-label">Conversas</p>
                  <p className="mt-2 ax-kpi text-3xl">
                    {conversationsCurrent.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 ax-caption">
                    {conversationsCurrent === 0
                      ? "nenhuma conversa esta semana"
                      : `analisada${conversationsCurrent === 1 ? "" : "s"} nos últimos 7 dias`}
                  </p>
                </div>
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="ax-kpi-label">Oportunidades</p>
                  <p className="mt-2 ax-kpi text-3xl text-[var(--color-primary)]">
                    {opportunitiesCurrent.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 ax-caption">
                    {opportunitiesCurrent === 0
                      ? "nenhuma intenção detectada ainda"
                      : opportunitiesCurrent >= 3
                        ? "hora de acelerar o comercial"
                        : "intenção de compra detectada"}
                  </p>
                </div>
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="ax-kpi-label">Conteúdos virais</p>
                  <p className="mt-2 ax-kpi text-3xl">
                    {viralCurrent.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 ax-caption">
                    {viralCurrent === 0
                      ? "radar não encontrou destaques"
                      : `com score ≥ 300 — vale investigar`}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-3">
                <Button asChild className="h-11 px-5">
                  <Link href="/whatsapp-intelligence">
                    {opportunitiesCurrent > 0
                      ? `Ver ${opportunitiesCurrent} oportunidade${opportunitiesCurrent === 1 ? "" : "s"}`
                      : "Ver operação"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-11 px-5">
                  <Link href="/settings?tab=integrations">Revisar integrações</Link>
                </Button>
              </div>
            </div>

            <aside className="dashboard-panel relative z-[1] flex h-full flex-col justify-between gap-3 rounded-[24px] p-4">
              <DecisionAxis active={!!aiSummary}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-primary-rgb)/0.10)] px-3 py-1.5 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Insight prioritário
                  </div>
                </div>

                <h2 className="ax-t2">
                  {aiSummary ? "O que fazer agora" : "Coletando inteligência"}
                </h2>
                <p className="mt-2 ax-body text-[var(--color-text-secondary)]">
                  {aiSummary ??
                    "O sistema está acumulando volume para gerar a primeira recomendação. Este bloco vai orientar a prioridade do time automaticamente."}
                </p>

                {!aiSummary && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex shrink-0 items-end gap-[3px]">
                      {([11, 18, 14, 24, 17, 22, 15] as number[]).map((h, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-sm bg-primary/40"
                          style={{ height: h }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted">
                      {conversationsCurrent.toLocaleString("pt-BR")} conversas coletadas
                    </p>
                  </div>
                )}
              </DecisionAxis>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <section className="relative">
              <div className="dot-pattern-bg pointer-events-none absolute inset-0 rounded-[24px] opacity-30" />
              <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <MetricCard
                  label="Posts publicados"
                  value={postsPublishedCurrent}
                  icon="share-2"
                  sublabel="últimos 7 dias"
                  change={getVariation(postsPublishedCurrent, postsPublishedPrevious)}
                  emptyMessage="Nenhum post nos últimos 7 dias"
                  ctaLabel="Criar post"
                  ctaHref="/social-publisher"
                  alert={
                    failedPostsCount > 0
                      ? {
                          count: failedPostsCount,
                          label: "falharam",
                          variant: "danger",
                        }
                      : undefined
                  }
                  emptyHint={
                    postsPublishedCurrent === 0
                      ? "Nenhum post publicado nos últimos 7 dias."
                      : undefined
                  }
                  sparkData={postSparkData}
                  animationDelay="delay-300"
                />
                <MetricCard
                  label="Conteúdos virais"
                  value={viralCurrent}
                  icon="flame"
                  sublabel="score >= 300 no radar"
                  change={getVariation(viralCurrent, viralPrevious)}
                  emptyMessage="Score >= 300 não encontrado no radar"
                  ctaLabel="Abrir radar"
                  ctaHref="/intelligence?tab=radar"
                  sparkData={viralSparkData}
                  variant="status"
                  animationDelay="delay-400"
                />
              </div>
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
