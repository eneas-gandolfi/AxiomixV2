/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard - hub de inteligência de negócio.
 *
 *            Estratégia de carregamento (Fase 1 + 2 + 3 — 2026-05-11):
 *            - Bootstrap (auth + membership + company) via RPC unica
 *              `dashboard_bootstrap` — 1 round-trip em vez de 3 sequenciais.
 *            - Shell (cabeçalho + saudação) renderiza imediatamente.
 *            - Cada bloco abaixo carrega num Suspense próprio. Stalled é
 *              compartilhado entre hero/insights e "Próxima ação" via
 *              React.cache. Sidebar e RiskControl compartilham os fetches
 *              de alertas via `getDashboardAlertsData`.
 * Autor: AXIOMIX
 * Data: 2026-03-19
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
import {
  DashboardNextActionSection,
  DashboardNextActionSkeleton,
} from "@/components/dashboard/dashboard-next-action-section";
import {
  DashboardConversationKpis,
  DashboardConversationKpisSkeleton,
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
    <div className="dashboard-panel rounded-[24px] p-5">
      <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-32 rounded" />
      <div className="skeleton-shimmer animate-shimmer mb-4 h-6 w-48 rounded" />
      <div className="skeleton-shimmer animate-shimmer h-24 w-full rounded-lg" />
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
      <section className="dashboard-mesh overflow-hidden rounded-[28px] border border-border/70 p-5 sm:p-6 lg:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="section-label rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
            Painel executivo
            {companyName ? ` · ${companyName.toUpperCase()}` : ""}
          </span>
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text)] sm:text-2xl">
          {greeting}
          {companyName ? `, ${companyName}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Em menos de 90 segundos: o que está sangrando, o que está crescendo, onde colocar a próxima hora.
        </p>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,340px)] xl:items-stretch">
          <Suspense fallback={<DashboardHeroSkeleton />}>
            <DashboardHeroSection companyId={companyId} nicheSlug={nicheSlug} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<DashboardNextActionSkeleton />}>
        <DashboardNextActionSection companyId={companyId} />
      </Suspense>

      <Suspense fallback={null}>
        <DashboardSidebarSection companyId={companyId} isOwnerOrAdmin={isOwnerOrAdmin} />
      </Suspense>

      <section className="space-y-4">
        <section className="relative">
          <div className="dot-pattern-bg pointer-events-none absolute inset-0 rounded-[24px] opacity-30" />
          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<DashboardConversationKpisSkeleton />}>
              <DashboardConversationKpis companyId={companyId} />
            </Suspense>
            <Suspense fallback={<DashboardCardSkeleton />}>
              <RiskControlCard companyId={companyId} />
            </Suspense>
          </div>
        </section>

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
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
          Operacional
        </span>
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
