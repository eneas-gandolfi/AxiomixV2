/**
 * Arquivo: src/components/dashboard/dashboard-hero-section.tsx
 * Proposito: Hero + Insights do dashboard. Carrega via Suspense independente
 *            da shell — usuario ja ve cabecalho/saudacao enquanto este bloco
 *            resolve. Compartilha `getStalledConversations` (React.cache) com
 *            o `DashboardNextActionSection`.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { HeroMetric } from "@/components/dashboard/hero-metric";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { getStalledConversations } from "@/lib/dashboard/shared-queries";
import { createDefaultInsightRegistry } from "@/lib/dashboard/insights/defaultRegistry";
import { getNicheBySlug, type NicheSlug } from "@/lib/niches";

export function DashboardHeroSkeleton() {
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="skeleton-shimmer animate-shimmer h-4 w-40 rounded" />
          <div className="skeleton-shimmer animate-shimmer h-6 w-16 rounded-full" />
        </div>
        <div className="skeleton-shimmer animate-shimmer mt-4 h-10 w-28 rounded" />
        <div className="skeleton-shimmer animate-shimmer mt-3 h-3 w-3/5 rounded" />
        <div className="skeleton-shimmer animate-shimmer mt-4 h-8 w-32 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-3 w-28 rounded" />
        <div className="space-y-2">
          <div className="skeleton-shimmer animate-shimmer h-3.5 w-full rounded" />
          <div className="skeleton-shimmer animate-shimmer h-3.5 w-5/6 rounded" />
          <div className="skeleton-shimmer animate-shimmer h-3.5 w-4/6 rounded" />
        </div>
      </div>
    </>
  );
}

export async function DashboardHeroSection({
  companyId,
  nicheSlug,
}: {
  companyId: string;
  nicheSlug: NicheSlug;
}) {
  const stalled = await getStalledConversations(companyId);
  const niche = getNicheBySlug(nicheSlug);
  const insights = createDefaultInsightRegistry().run({ nicheSlug, stalled });

  return (
    <>
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
    </>
  );
}
