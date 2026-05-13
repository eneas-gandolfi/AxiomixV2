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
      <div className="dashboard-panel min-h-[200px] rounded-[24px] p-6">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-32 rounded" />
        <div className="skeleton-shimmer animate-shimmer mb-4 h-16 w-40 rounded" />
        <div className="skeleton-shimmer animate-shimmer h-20 w-full rounded-lg" />
      </div>
      <div className="dashboard-panel min-h-[200px] rounded-[24px] p-6">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-32 rounded" />
        <div className="space-y-3">
          <div className="skeleton-shimmer animate-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer animate-shimmer h-4 w-5/6 rounded" />
          <div className="skeleton-shimmer animate-shimmer h-4 w-4/6 rounded" />
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
