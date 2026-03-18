/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard — hub de inteligência de negócio
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Flame,
  MessageSquare,
  Share2,
  ShoppingCart,
} from "lucide-react";
import type { Database, Json } from "@/database/types/database.types";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import { CompetitiveIntelligenceCard } from "@/components/dashboard/competitive-intelligence-card";
import { ContentPerformanceChart } from "@/components/dashboard/content-performance-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardSentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RetryDashboardButton } from "@/components/dashboard/retry-dashboard-button";
import {
  SentimentOverview,
  type SentimentOverviewData,
} from "@/components/dashboard/sentiment-overview";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  SentimentTrendDataPoint,
  ContentPerformanceDataPoint,
  CompetitiveIntelligenceData,
  ViralPostHighlight,
} from "@/types/modules/dashboard.types";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];

const DAY_MS = 86_400_000;

function getTimeWindows() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  return {
    nowIso: now.toISOString(),
    sevenDaysAgoIso: sevenDaysAgo.toISOString(),
    fourteenDaysAgoIso: fourteenDaysAgo.toISOString(),
    thirtyDaysAgoIso: thirtyDaysAgo.toISOString(),
    fortyEightHoursAgoIso: fortyEightHoursAgo.toISOString(),
  };
}

function getVariation(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return null;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "agora";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60_000), 0);
  if (diffMinutes < 1) {
    return "agora";
  }
  if (diffMinutes < 60) {
    return `há ${diffMinutes}min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) {
    return [] as string[];
  }

  return rawPlatforms
    .map((platform) => (typeof platform === "string" ? platform : null))
    .filter((platform): platform is string => Boolean(platform));
}

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

  try {
    const {
      nowIso,
      sevenDaysAgoIso,
      fourteenDaysAgoIso,
      thirtyDaysAgoIso,
      fortyEightHoursAgoIso,
    } = getTimeWindows();

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
      sentimentTrendResult,
      negativeInsightsResult,
      integrationsResult,
      postsByPlatformResult,
      viralPostsResult,
      competitorProfilesResult,
      latestInsightResult,
      competitorCountResult,
    ] = await Promise.all([
      // Metric: conversations (current 7d)
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", sevenDaysAgoIso)
        .lte("last_message_at", nowIso),
      // Metric: conversations (previous 7d)
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", fourteenDaysAgoIso)
        .lt("last_message_at", sevenDaysAgoIso),
      // Metric: purchase intent (current 7d)
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", sevenDaysAgoIso)
        .lte("generated_at", nowIso),
      // Metric: purchase intent (previous 7d)
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", fourteenDaysAgoIso)
        .lt("generated_at", sevenDaysAgoIso),
      // Metric: published posts (current 7d)
      supabase
        .from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "published")
        .gte("published_at", sevenDaysAgoIso)
        .lte("published_at", nowIso),
      // Metric: published posts (previous 7d)
      supabase
        .from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "published")
        .gte("published_at", fourteenDaysAgoIso)
        .lt("published_at", sevenDaysAgoIso),
      // Alert: failed posts (7d)
      supabase
        .from("scheduled_posts")
        .select("id, platforms, created_at")
        .eq("company_id", companyId)
        .eq("status", "failed")
        .gte("created_at", sevenDaysAgoIso)
        .lte("created_at", nowIso),
      // Metric: viral content (current 7d)
      supabase
        .from("collected_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("engagement_score", 300)
        .gte("collected_at", sevenDaysAgoIso)
        .lte("collected_at", nowIso),
      // Metric: viral content (previous 7d)
      supabase
        .from("collected_posts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("engagement_score", 300)
        .gte("collected_at", fourteenDaysAgoIso)
        .lt("collected_at", sevenDaysAgoIso),
      // Sentiment trend: 30 days (serves both trend chart and overview)
      supabase
        .from("conversation_insights")
        .select("sentiment, generated_at")
        .eq("company_id", companyId)
        .gte("generated_at", thirtyDaysAgoIso)
        .lte("generated_at", nowIso)
        .limit(5000),
      // Alert: negative insights (48h)
      supabase
        .from("conversation_insights")
        .select("conversation_id, generated_at")
        .eq("company_id", companyId)
        .eq("sentiment", "negativo")
        .gte("generated_at", fortyEightHoursAgoIso)
        .order("generated_at", { ascending: false }),
      // Alert: integrations with errors
      supabase
        .from("integrations")
        .select("id, company_id, created_at, type, is_active, test_status, last_tested_at, config")
        .eq("company_id", companyId),
      // Content performance: posts by platform (7d)
      supabase
        .from("scheduled_posts")
        .select("id, platforms, status")
        .eq("company_id", companyId)
        .in("status", ["published", "failed"])
        .gte("created_at", sevenDaysAgoIso)
        .lte("created_at", nowIso),
      // Competitive intelligence: top viral posts (7d)
      supabase
        .from("collected_posts")
        .select("id, platform, content, engagement_score, post_url, competitor_id, collected_at, source_type")
        .eq("company_id", companyId)
        .gte("engagement_score", 100)
        .gte("collected_at", sevenDaysAgoIso)
        .order("engagement_score", { ascending: false })
        .limit(5),
      // Competitive intelligence: competitor names
      supabase
        .from("competitor_profiles")
        .select("id, name")
        .eq("company_id", companyId),
      // Competitive intelligence: latest insight
      supabase
        .from("intelligence_insights")
        .select("top_themes, recommendations, generated_at")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Competitive intelligence: competitor count
      supabase
        .from("competitor_profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
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
      sentimentTrendResult.error,
      negativeInsightsResult.error,
      integrationsResult.error,
      postsByPlatformResult.error,
      viralPostsResult.error,
      competitorProfilesResult.error,
      latestInsightResult.error,
      competitorCountResult.error,
    ];

    if (queryErrors.some((queryError) => queryError)) {
      throw new Error("Erro ao carregar dados. Tente novamente.");
    }

    // ── Metric cards ──

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
    const failedPlatforms = Array.from(
      new Set(
        failedPosts
          .flatMap((post) => extractPlatforms(post.platforms))
          .map((platform) => platform[0]?.toUpperCase() + platform.slice(1))
      )
    );

    // ── Sentiment trend (30 days) + overview (7 days from same data) ──

    const allSentiments = sentimentTrendResult.data ?? [];
    const sevenDaysAgoDate = new Date(sevenDaysAgoIso);

    // Build 30-day trend
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

    // Derive 7-day sentiment overview from the same data
    const recentSentiments = allSentiments.filter(
      (s) => s.generated_at && new Date(s.generated_at) >= sevenDaysAgoDate
    );
    const sentimentData: SentimentOverviewData = {
      positive: recentSentiments.filter((s) => s.sentiment === "positivo").length,
      neutral: recentSentiments.filter((s) => s.sentiment === "neutro").length,
      negative: recentSentiments.filter((s) => s.sentiment === "negativo").length,
      total: recentSentiments.length,
    };

    // ── Content performance by platform ──

    const platformCounts: Record<string, { published: number; failed: number }> = {
      instagram: { published: 0, failed: 0 },
      linkedin: { published: 0, failed: 0 },
      tiktok: { published: 0, failed: 0 },
    };

    const PLATFORM_LABELS: Record<string, string> = {
      instagram: "Instagram",
      linkedin: "LinkedIn",
      tiktok: "TikTok",
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

    // ── Competitive intelligence ──

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

    // ── Alerts ──

    const integrations = integrationsResult.data ?? [];

    const negativeInsights = negativeInsightsResult.data ?? [];
    const uniqueConversationIds = Array.from(
      new Set(
        negativeInsights
          .map((item) => item.conversation_id)
          .filter((value): value is string => typeof value === "string")
      )
    );

    let unresolvedNegativeCount = 0;
    let latestNegativeConversationText = "";

    if (uniqueConversationIds.length > 0) {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, status, contact_name")
        .eq("company_id", companyId)
        .in("id", uniqueConversationIds);

      if (conversationsError) {
        throw new Error("Erro ao carregar dados. Tente novamente.");
      }

      const conversationMap = new Map(
        (conversationsData ?? []).map((item) => [item.id, item])
      );

      const unresolvedConversationIds = new Set<string>();
      for (const insight of negativeInsights) {
        if (!insight.conversation_id) {
          continue;
        }

        const conversation = conversationMap.get(insight.conversation_id);
        const isResolved =
          conversation?.status?.toLowerCase().trim() === "resolved";
        if (!isResolved) {
          unresolvedConversationIds.add(insight.conversation_id);
        }
      }

      unresolvedNegativeCount = unresolvedConversationIds.size;

      const latestNegative = negativeInsights.find((insight) =>
        insight.conversation_id
          ? unresolvedConversationIds.has(insight.conversation_id)
          : false
      );

      if (latestNegative?.conversation_id) {
        const latestConversation = conversationMap.get(latestNegative.conversation_id);
        const contactName = latestConversation?.contact_name ?? "Contato sem nome";
        latestNegativeConversationText = `Última: ${contactName} — ${formatRelativeTime(
          latestNegative.generated_at
        )}`;
      }
    }

    const alerts: DashboardAlert[] = [];

    if (unresolvedNegativeCount > 0) {
      alerts.push({
        id: "negative-conversations",
        variant: "danger",
        title: `${unresolvedNegativeCount} conversas negativas sem resposta`,
        description: latestNegativeConversationText || "Há conversas críticas aguardando retorno.",
        actionHref: "/whatsapp-intelligence",
        actionLabel: "Ver todas",
      });
    }

    if (failedPostsCount > 0) {
      alerts.push({
        id: "failed-posts",
        variant: "danger",
        title: `${failedPostsCount} posts falharam na publicação`,
        description:
          failedPlatforms.length > 0
            ? failedPlatforms.join(" · ")
            : "Verifique os canais e tente publicar novamente.",
        actionHref: "/social-publisher",
        actionLabel: "Ver posts",
      });
    }

    integrations
      .filter((integration) => integration.test_status === "error")
      .forEach((integration) => {
        const integrationLabelByType: Record<IntegrationRow["type"], string> = {
          sofia_crm: "Sofia CRM",
          evolution_api: "Evolution API",
          upload_post: "Upload-Post API",
          openrouter: "OpenRouter",
        };

        alerts.push({
          id: `integration-${integration.type}`,
          variant: "warning",
          title: `${integrationLabelByType[integration.type]} com erro`,
          description: integration.last_tested_at
            ? `Último teste ${formatRelativeTime(integration.last_tested_at)}`
            : "A integração precisa ser revisada.",
          actionHref: "/settings?tab=integrations",
          actionLabel: "Verificar configuração",
        });
      });

    return (
      <main
        className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 md:p-8"
        style={{ '--module-color': '#8A8A8A', '--module-color-bg': '#F1F5F9' } as React.CSSProperties}
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)]">Dashboard</h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              Visão geral do seu negócio: vendas, sentimento e marketing.
            </p>
          </div>
        </header>

        {alerts.length > 0 ? <AlertsCard alerts={alerts} /> : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Conversas analisadas"
            value={conversationsCurrent}
            icon={MessageSquare}
            sublabel="últimos 7 dias"
            change={getVariation(conversationsCurrent, conversationsPrevious)}
            emptyMessage="Primeiros dados desta semana"
            ctaLabel="Ver conversas"
            ctaHref="/whatsapp-intelligence"
            emptyHint={
              conversationsCurrent === 0
                ? "Conecte o Sofia CRM em Configurações para começar a sincronizar conversas."
                : undefined
            }
          />
          <MetricCard
            label="Oportunidades de venda"
            value={opportunitiesCurrent}
            icon={ShoppingCart}
            sublabel="intenção de compra detectada"
            change={getVariation(opportunitiesCurrent, opportunitiesPrevious)}
            emptyMessage="Nenhuma intenção de compra detectada ainda"
            ctaLabel="Ver oportunidades"
            ctaHref="/whatsapp-intelligence?filter=compra"
          />
          <MetricCard
            label="Posts publicados"
            value={postsPublishedCurrent}
            icon={Share2}
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
          />
          <MetricCard
            label="Conteúdos virais"
            value={viralCurrent}
            icon={Flame}
            sublabel="score >= 300 no radar"
            change={getVariation(viralCurrent, viralPrevious)}
            emptyMessage="Score >= 300 não encontrado no radar"
            ctaLabel="Abrir radar"
            ctaHref="/intelligence?tab=radar"
          />
        </section>

        <section>
          <DashboardSentimentTrendChart data={sentimentTrendData} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ContentPerformanceChart data={contentPerformanceData} />
          <CompetitiveIntelligenceCard data={competitiveIntelligenceData} />
        </section>

        <section>
          <SentimentOverview data={sentimentData} />
        </section>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
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
