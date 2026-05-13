/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard — hub de inteligência de negócio.
 *
 *            Estratégia de carregamento (Fase 1 reorg — 2026-05-13):
 *            - Bootstrap (auth + membership + company) via RPC unica
 *              `dashboard_bootstrap` — 1 round-trip em vez de 3 sequenciais.
 *            - Header funcional (~56px) renderiza imediatamente.
 *            - NextAction é o novo herói — topo absoluto após o header,
 *              responde a pergunta #1 do gestor ("tem alguém sem resposta?").
 *            - Cada bloco abaixo carrega num Suspense próprio. Stalled é
 *              compartilhado entre hero/insights e "Próxima ação" via
 *              React.cache. Sidebar e RiskControl compartilham os fetches
 *              de alertas via `getDashboardAlertsData`.
 * Autor: AXIOMIX
 * Data: 2026-05-13 (Fase 1 — reorg mobile-first)
 */

import { Suspense, type CSSProperties } from "react";
import { redirect } from "next/navigation";
import { DashboardChartsSection } from "@/components/dashboard/dashboard-charts-section";
import { DashboardSidebarSection } from "@/components/dashboard/dashboard-sidebar-section";
import { NicheBenchmarkCard } from "@/components/dashboard/niche-benchmark-card";
import { RiskControlCard } from "@/components/dashboard/risk-control-card";
import {
  DashboardHeroSection,
  DashboardHeroSkeleton,
} from "@/components/dashboard/dashboard-hero-section";
import { DashboardNextActionSection } from "@/components/dashboard/dashboard-next-action-section";
import {
  DashboardConversationKpis,
  DashboardConversationKpisSkeleton,
  KpiHeroCards,
  KpiHeroCardsSkeleton,
} from "@/components/dashboard/dashboard-conversation-kpis";
import { getDashboardBootstrap } from "@/lib/dashboard/bootstrap";
import { isValidNicheSlug } from "@/lib/niches";

function getGreeting(): string {
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hour = brTime.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
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

function DashboardCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
      <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-32 rounded" />
      <div className="skeleton-shimmer animate-shimmer mb-4 h-6 w-48 rounded" />
      <div className="skeleton-shimmer animate-shimmer h-20 w-full rounded-lg" />
    </div>
  );
}

/**
 * Skeleton compacto pro `RiskControlCard`. Empty state real é uma linha só
 * (~64px: check verde + "Tudo em dia"); cair em um placeholder de 140px
 * causaria layout shift visível. Mantém o shape do empty state já que é o
 * caso mais comum.
 */
function RiskControlCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="skeleton-shimmer animate-shimmer h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="skeleton-shimmer animate-shimmer h-3.5 w-32 rounded" />
        <div className="skeleton-shimmer animate-shimmer h-3 w-40 rounded" />
      </div>
    </div>
  );
}

function NextActionSkeleton() {
  return (
    <div
      className="min-h-[140px] relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      style={{ background: "var(--color-primary)" }}
      aria-hidden="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="h-11 w-11 shrink-0 rounded-full bg-white/20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-24 rounded bg-white/25" />
          <div className="h-5 w-3/5 rounded bg-white/30" />
          <div className="h-3 w-2/3 rounded bg-white/20" />
          <div className="mt-2 h-8 w-32 rounded-lg bg-white/25" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const bootstrap = await getDashboardBootstrap();

  if (bootstrap.kind === "unauthenticated") {
    redirect("/login");
  }
  if (bootstrap.kind === "no-company") {
    redirect("/onboarding");
  }

  const { companyId, companyName } = bootstrap;
  const isOwnerOrAdmin = bootstrap.role === "owner" || bootstrap.role === "admin";
  const nicheSlug = isValidNicheSlug(bootstrap.nicheSlug) ? bootstrap.nicheSlug : "outro";
  const greeting = getGreeting();

  return (
    <main
      className="dashboard-stage mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8"
      style={
        {
          "--module-color": "var(--color-primary)",
          "--module-color-bg": "var(--color-primary-dim)",
        } as CSSProperties
      }
    >
      {/* Header funcional (~56px) — substituiu o mesh hero gigante */}
      <header className="flex items-center justify-between gap-3 px-1">
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg">
          {greeting}
          {companyName ? `, ${companyName}` : ""}.
        </h1>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]"
            aria-hidden="true"
          />
          <span>Operacional</span>
        </div>
      </header>

      {/* Herói: Próxima ação recomendada — topo absoluto */}
      <Suspense fallback={<NextActionSkeleton />}>
        <DashboardNextActionSection companyId={companyId} />
      </Suspense>

      {/* Strip de 4 KPIs compactos — 2-col no mobile, 4-col no desktop */}
      <section className="space-y-4">
        <section className="relative">
          <div className="dot-pattern-bg pointer-events-none absolute inset-0 rounded-[24px] opacity-30" />
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Suspense fallback={<DashboardConversationKpisSkeleton />}>
              <DashboardConversationKpis companyId={companyId} />
            </Suspense>
          </div>
        </section>

        {/* Alertas / Sidebar — depois do strip pra jornada Hero→KPIs→Alertas */}
        <Suspense fallback={null}>
          <DashboardSidebarSection companyId={companyId} isOwnerOrAdmin={isOwnerOrAdmin} />
        </Suspense>

        {/* RiskControl + MetricCards hero (conversas 7d + oportunidades) */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<RiskControlCardSkeleton />}>
            <RiskControlCard companyId={companyId} />
          </Suspense>
          <Suspense fallback={<KpiHeroCardsSkeleton />}>
            <KpiHeroCards companyId={companyId} />
          </Suspense>
        </section>

        {/* HeroMetric + InsightsPanel (detalhe operacional) */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,340px)] xl:items-stretch">
          <Suspense fallback={<DashboardHeroSkeleton />}>
            <DashboardHeroSection companyId={companyId} nicheSlug={nicheSlug} />
          </Suspense>
        </div>

        <section>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <NicheBenchmarkCard companyId={companyId} />
          </Suspense>
        </section>

        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardChartsSection companyId={companyId} />
        </Suspense>
      </section>

      <footer className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[11px] text-[var(--color-text-tertiary)]">
        <span>Dados sincronizados de Evo CRM</span>
        <span aria-hidden="true">·</span>
        <a
          href="/settings?tab=integrations"
          className="border-b border-border/70 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          Configurar sincronização →
        </a>
      </footer>
    </main>
  );
}
