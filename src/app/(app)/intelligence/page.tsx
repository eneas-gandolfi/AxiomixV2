/**
 * Arquivo: src/app/(app)/intelligence/page.tsx
 * Propósito: Renderizar modulo Intelligence v2.0 com dashboard, concorrentes, radar e salvos.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 * Versão: 2.0 (Enhanced)
 */

import type React from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layouts/page-container";
import { IntelligenceModuleEnhanced } from "@/components/intelligence/intelligence-module-enhanced";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompetitorMetrics = {
  competitor_id: string | null;
  engagement_score: number | null;
  collected_at: string | null;
};

type CompetitorInsightRow = {
  competitor_id: string | null;
  content: string | null;
  generated_at: string | null;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export default async function IntelligencePage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: company }, { data: competitors }] = await Promise.all([
    supabase.from("companies").select("id, niche, sub_niche").eq("id", companyId).maybeSingle(),
    supabase
      .from("competitor_profiles")
      .select("id, name, website_url, instagram_url, linkedin_url, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  const competitorIds = (competitors ?? []).map((competitor) => competitor.id);
  const [{ data: competitorPosts }, { data: competitorInsights }, { data: radarPosts }] = await Promise.all([
    competitorIds.length > 0
      ? supabase
          .from("collected_posts")
          .select("competitor_id, engagement_score, collected_at")
          .eq("company_id", companyId)
          .eq("source_type", "competitor")
          .in("competitor_id", competitorIds)
          .order("collected_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as CompetitorMetrics[] }),
    competitorIds.length > 0
      ? supabase
          .from("intelligence_insights")
          .select("competitor_id, content, generated_at")
          .eq("company_id", companyId)
          .eq("source_type", "competitor")
          .in("competitor_id", competitorIds)
          .order("generated_at", { ascending: false })
      : Promise.resolve({ data: [] as CompetitorInsightRow[] }),
    supabase
      .from("collected_posts")
      .select(
        "id, platform, post_url, content, likes_count, comments_count, shares_count, engagement_score, posted_at, collected_at"
      )
      .eq("company_id", companyId)
      .eq("source_type", "radar")
      .gte("collected_at", sevenDaysAgoIso)
      .order("engagement_score", { ascending: false })
      .limit(80),
  ]);

  const postsByCompetitor = new Map<string, CompetitorMetrics[]>();
  for (const post of competitorPosts ?? []) {
    if (!post.competitor_id) {
      continue;
    }
    const current = postsByCompetitor.get(post.competitor_id) ?? [];
    current.push(post);
    postsByCompetitor.set(post.competitor_id, current);
  }

  const latestInsightByCompetitor = new Map<string, string>();
  for (const insight of competitorInsights ?? []) {
    if (!insight.competitor_id || !insight.content) {
      continue;
    }
    if (!latestInsightByCompetitor.has(insight.competitor_id)) {
      latestInsightByCompetitor.set(insight.competitor_id, insight.content);
    }
  }

  const competitorCards = (competitors ?? []).map((competitor) => {
    const competitorMetrics = postsByCompetitor.get(competitor.id) ?? [];
    const engagementValues = competitorMetrics
      .map((metric) => metric.engagement_score ?? 0)
      .filter((value) => value >= 0);
    const lastCollectedAt = competitorMetrics[0]?.collected_at ?? null;

    return {
      id: competitor.id,
      name: competitor.name,
      websiteUrl: competitor.website_url,
      instagramUrl: competitor.instagram_url,
      linkedinUrl: competitor.linkedin_url,
      avgEngagement: average(engagementValues),
      lastCollectedAt,
      latestInsight: latestInsightByCompetitor.get(competitor.id) ?? null,
    };
  });

  const radarCards = (radarPosts ?? []).map((post) => ({
    id: post.id,
    platform: post.platform,
    postUrl: post.post_url,
    content: post.content,
    likesCount: post.likes_count ?? 0,
    commentsCount: post.comments_count ?? 0,
    sharesCount: post.shares_count ?? 0,
    engagementScore: post.engagement_score ?? 0,
    postedAt: post.posted_at,
    collectedAt: post.collected_at,
  }));

  return (
    <div style={{ '--module-color': '#D4A853', '--module-color-bg': '#FDF6E3' } as React.CSSProperties}>
    <PageContainer
      title="Intelligence"
      description="Monitore concorrentes e identifique conteudos virais do seu nicho."
    >
      <IntelligenceModuleEnhanced
        companyId={companyId}
        niche={company?.niche ?? null}
        subNiche={company?.sub_niche ?? null}
        competitors={competitorCards}
        radarPosts={radarCards}
      />
    </PageContainer>
    </div>
  );
}
