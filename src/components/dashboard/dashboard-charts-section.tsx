/**
 * Arquivo: src/components/dashboard/dashboard-charts-section.tsx
 * Propósito: Seção de gráficos do dashboard carregada com Suspense independente.
 */

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardSentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import { ContentPerformanceChart } from "@/components/dashboard/content-performance-chart";
import {
  SentimentOverview,
  type SentimentOverviewData,
} from "@/components/dashboard/sentiment-overview";
import { CompetitiveIntelligenceCard } from "@/components/dashboard/competitive-intelligence-card";
import type {
  SentimentTrendDataPoint,
  ContentPerformanceDataPoint,
  CompetitiveIntelligenceData,
  ViralPostHighlight,
} from "@/types/modules/dashboard.types";
import type { Json } from "@/database/types/database.types";

const DAY_MS = 86_400_000;

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) return [] as string[];
  return rawPlatforms
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

export async function DashboardChartsSection({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const nowIso = now.toISOString();

  const [
    sentimentTrendResult,
    postsByPlatformResult,
    viralPostsResult,
    competitorProfilesResult,
    latestInsightResult,
    competitorCountResult,
  ] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("sentiment, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", thirtyDaysAgoIso)
      .lte("generated_at", nowIso)
      .limit(5000),
    supabase
      .from("scheduled_posts")
      .select("id, platforms, status")
      .eq("company_id", companyId)
      .in("status", ["published", "failed"])
      .gte("created_at", sevenDaysAgoIso)
      .lte("created_at", nowIso),
    supabase
      .from("collected_posts")
      .select("id, platform, content, engagement_score, post_url, competitor_id, collected_at, source_type")
      .eq("company_id", companyId)
      .gte("engagement_score", 100)
      .gte("collected_at", sevenDaysAgoIso)
      .order("engagement_score", { ascending: false })
      .limit(5),
    supabase
      .from("competitor_profiles")
      .select("id, name")
      .eq("company_id", companyId),
    supabase
      .from("intelligence_insights")
      .select("top_themes, recommendations, generated_at")
      .eq("company_id", companyId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("competitor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  // Sentiment trend (30 dias)
  const allSentiments = sentimentTrendResult.data ?? [];
  const sevenDaysAgoDate = new Date(sevenDaysAgoIso);

  const sentimentByDate = new Map<string, { positivo: number; neutro: number; negativo: number }>();
  for (const insight of allSentiments) {
    if (!insight.generated_at || !insight.sentiment) continue;
    const dateKey = new Date(insight.generated_at).toISOString().split("T")[0];
    const current = sentimentByDate.get(dateKey) ?? { positivo: 0, neutro: 0, negativo: 0 };
    if (insight.sentiment === "positivo") current.positivo++;
    else if (insight.sentiment === "neutro") current.neutro++;
    else if (insight.sentiment === "negativo") current.negativo++;
    sentimentByDate.set(dateKey, current);
  }

  const sentimentTrendData: SentimentTrendDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS).toISOString().split("T")[0];
    const counts = sentimentByDate.get(date) ?? { positivo: 0, neutro: 0, negativo: 0 };
    sentimentTrendData.push({ date, ...counts });
  }

  const recentSentiments = allSentiments.filter(
    (s) => s.generated_at && new Date(s.generated_at) >= sevenDaysAgoDate
  );
  const sentimentData: SentimentOverviewData = {
    positive: recentSentiments.filter((s) => s.sentiment === "positivo").length,
    neutral: recentSentiments.filter((s) => s.sentiment === "neutro").length,
    negative: recentSentiments.filter((s) => s.sentiment === "negativo").length,
    total: recentSentiments.length,
  };

  // Content performance
  const PLATFORM_LABELS: Record<string, string> = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };
  const platformCounts: Record<string, { published: number; failed: number }> = {
    instagram: { published: 0, failed: 0 },
    linkedin: { published: 0, failed: 0 },
    tiktok: { published: 0, failed: 0 },
  };
  for (const post of postsByPlatformResult.data ?? []) {
    const platforms = extractPlatforms(post.platforms);
    for (const platform of platforms) {
      const key = platform.toLowerCase();
      if (platformCounts[key]) {
        if (post.status === "published") platformCounts[key].published++;
        else if (post.status === "failed") platformCounts[key].failed++;
      }
    }
  }
  const contentPerformanceData: ContentPerformanceDataPoint[] = Object.entries(platformCounts).map(
    ([platform, counts]) => ({
      platform: platform as ContentPerformanceDataPoint["platform"],
      platformLabel: PLATFORM_LABELS[platform] ?? platform,
      published: counts.published,
      failed: counts.failed,
    })
  );

  // Competitive intelligence
  const competitorMap = new Map(
    (competitorProfilesResult.data ?? []).map((c) => [c.id, c.name])
  );
  const viralPosts: ViralPostHighlight[] = (viralPostsResult.data ?? [])
    .slice(0, 3)
    .map((post) => ({
      id: post.id,
      platform: post.platform ?? "instagram",
      content: (post.content ?? "").slice(0, 120),
      engagementScore: post.engagement_score ?? 0,
      postUrl: post.post_url,
      competitorName: post.competitor_id ? (competitorMap.get(post.competitor_id) ?? null) : null,
      collectedAt: post.collected_at ?? "",
    }));

  const latestInsight = latestInsightResult.data;
  const trendingThemes: string[] = Array.isArray(latestInsight?.top_themes)
    ? (latestInsight.top_themes as string[]).slice(0, 6)
    : [];
  const recommendations: string[] = Array.isArray(latestInsight?.recommendations)
    ? (latestInsight.recommendations as string[]).slice(0, 3)
    : [];
  const competitiveIntelligenceData: CompetitiveIntelligenceData = {
    viralPosts,
    trendingThemes,
    recommendations,
    totalCompetitors: competitorCountResult.count ?? 0,
    lastInsightAt: latestInsight?.generated_at ?? null,
  };

  return (
    <>
      <section>
        <DashboardSentimentTrendChart data={sentimentTrendData} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContentPerformanceChart data={contentPerformanceData} />
        <SentimentOverview data={sentimentData} />
      </section>

      <section>
        <CompetitiveIntelligenceCard data={competitiveIntelligenceData} />
      </section>
    </>
  );
}
