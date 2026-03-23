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
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Database, Json } from "@/database/types/database.types";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import { CompetitiveIntelligenceCard } from "@/components/dashboard/competitive-intelligence-card";
import { ContentPerformanceChart } from "@/components/dashboard/content-performance-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  IntegrationsStatusCard,
  type IntegrationStatusItem,
} from "@/components/dashboard/integrations-status-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NextReportCard } from "@/components/dashboard/next-report-card";
import {
  RecentReportsCard,
  type RecentReportItem,
} from "@/components/dashboard/recent-reports-card";
import { RetryDashboardButton } from "@/components/dashboard/retry-dashboard-button";
import { DashboardSentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import {
  SentimentOverview,
  type SentimentOverviewData,
} from "@/components/dashboard/sentiment-overview";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { markStaleJobsFailed } from "@/lib/jobs/queue";
import type {
  SentimentTrendDataPoint,
  ContentPerformanceDataPoint,
  CompetitiveIntelligenceData,
  ViralPostHighlight,
} from "@/types/modules/dashboard.types";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];
type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];
type AsyncJobRow = Database["public"]["Tables"]["async_jobs"]["Row"];

type IntegrationStatusRow = Pick<
  IntegrationRow,
  "type" | "is_active" | "test_status" | "last_tested_at" | "config"
>;

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

function getGreeting(): string {
  const hour = new Date().getHours();
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

function parseReportText(payload: Json | null, fallback?: Json | null) {
  const parseObject = (value?: Json | null) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    return value;
  };

  const resultObject = parseObject(fallback);
  if (resultObject) {
    const resultReportText = resultObject.reportText ?? resultObject.report_text;
    if (typeof resultReportText === "string" && resultReportText.trim().length > 0) {
      return resultReportText;
    }
  }

  const payloadObject = parseObject(payload);
  if (payloadObject) {
    const payloadReportText = payloadObject.reportText ?? payloadObject.report_text;
    if (typeof payloadReportText === "string" && payloadReportText.trim().length > 0) {
      return payloadReportText;
    }
  }

  return "Relatório sem conteúdo disponível.";
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "***********";
  }
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} *****-${digits.slice(-4)}`;
}

function nextMondayAtEight(reference: Date) {
  const next = new Date(reference);
  next.setHours(8, 0, 0, 0);

  const day = reference.getDay();
  let daysUntilMonday = (8 - day) % 7;

  if (daysUntilMonday === 0 && reference >= next) {
    daysUntilMonday = 7;
  }

  next.setDate(reference.getDate() + daysUntilMonday);
  return next;
}

function formatNextSendLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(date);
  const capitalizedWeekday = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return `${capitalizedWeekday}, ${datePart} às 08:00`;
}

function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function toIntegrationStatusItems(
  rows: IntegrationStatusRow[],
  options?: { openRouterEnvEnabled?: boolean }
): IntegrationStatusItem[] {
  const byType = new Map(rows.map((row) => [row.type, row]));
  const allTypes: IntegrationStatusItem["type"][] = [
    "sofia_crm",
    "evolution_api",
    "upload_post",
    "openrouter",
  ];

  return allTypes.map((type) => {
    const row = byType.get(type);
    if (!row) {
      if (type === "openrouter" && options?.openRouterEnvEnabled) {
        return { type, status: "connected", lastTestedAt: null };
      }

      return { type, status: "missing", lastTestedAt: null };
    }

    if (row.test_status === "ok" && row.is_active) {
      return { type, status: "connected", lastTestedAt: row.last_tested_at };
    }

    if (row.test_status === "error") {
      return { type, status: "error", lastTestedAt: row.last_tested_at };
    }

    return { type, status: "missing", lastTestedAt: row.last_tested_at };
  });
}

function resolveEvolutionDisplayStatus(row: IntegrationStatusRow | undefined) {
  if (!row) {
    return { state: "missing" as const, label: "Não configurado" };
  }

  if (row.test_status === "ok" && row.is_active) {
    return { state: "active" as const, label: "Evolution API ativa" };
  }

  if (row.test_status === "error") {
    return { state: "error" as const, label: "Evolution API com erro" };
  }

  return { state: "missing" as const, label: "Não configurado" };
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
  const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
  const greeting = getGreeting();

  const { data: companyRow } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  const companyName = companyRow?.name ?? null;

  await markStaleJobsFailed(companyId);

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
      conversationDatesResult,
      opportunityDatesResult,
      postDatesResult,
      viralDatesResult,
      reportsDoneResult,
      reportsQueueResult,
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
        .from("conversation_insights")
        .select("sentiment, generated_at")
        .eq("company_id", companyId)
        .gte("generated_at", thirtyDaysAgoIso)
        .lte("generated_at", nowIso)
        .limit(5000),
      supabase
        .from("conversation_insights")
        .select("conversation_id, generated_at")
        .eq("company_id", companyId)
        .eq("sentiment", "negativo")
        .gte("generated_at", fortyEightHoursAgoIso)
        .order("generated_at", { ascending: false }),
      supabase
        .from("integrations")
        .select("id, company_id, created_at, type, is_active, test_status, last_tested_at, config")
        .eq("company_id", companyId),
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
        .from("async_jobs")
        .select("id, completed_at, payload, result, status, error_message")
        .eq("company_id", companyId)
        .eq("job_type", "weekly_report")
        .in("status", ["done", "failed"])
        .order("completed_at", { ascending: false })
        .limit(3),
      supabase
        .from("async_jobs")
        .select("id, status, created_at")
        .eq("company_id", companyId)
        .eq("job_type", "weekly_report")
        .in("status", ["pending", "running"])
        .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString()),
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
      conversationDatesResult.error,
      opportunityDatesResult.error,
      postDatesResult.error,
      viralDatesResult.error,
      reportsDoneResult.error,
      reportsQueueResult.error,
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
    const failedPlatforms = Array.from(
      new Set(
        failedPosts
          .flatMap((post) => extractPlatforms(post.platforms))
          .map((platform) => platform[0]?.toUpperCase() + platform.slice(1))
      )
    );

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

    const integrations = (integrationsResult.data ?? []) as IntegrationRow[];
    const openRouterEnvEnabled = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    const integrationStatusItems = toIntegrationStatusItems(
      integrations as IntegrationStatusRow[],
      { openRouterEnvEnabled }
    );
    const connectedIntegrationsCount = integrationStatusItems.filter(
      (integration) => integration.status === "connected"
    ).length;

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
        const isResolved = conversation?.status?.toLowerCase().trim() === "resolved";
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
        latestNegativeConversationText = `Última: ${contactName} - ${formatRelativeTime(
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

    const reportQueue = (reportsQueueResult.data ?? []) as Pick<
      AsyncJobRow,
      "id" | "status" | "created_at"
    >[];
    const hasReportQueued = reportQueue.length > 0;
    const hasRunningReport = reportQueue.some((job) => job.status === "running");
    const firstQueuedJob = reportQueue[0] ?? null;
    const runningJobCreatedAt = firstQueuedJob?.created_at ?? null;

    const evolutionIntegration = integrations.find((integration) => integration.type === "evolution_api");
    const evolutionStatus = resolveEvolutionDisplayStatus(evolutionIntegration);

    let managerPhoneMasked = "***********";
    try {
      if (evolutionIntegration?.config) {
        const evolutionConfig = decodeIntegrationConfig(
          "evolution_api",
          evolutionIntegration.config
        );
        if (evolutionConfig.managerPhone) {
          managerPhoneMasked = maskPhone(evolutionConfig.managerPhone);
        }
      }
    } catch {
      managerPhoneMasked = "***********";
    }

    const canSendNow =
      isOwnerOrAdmin &&
      evolutionStatus.state === "active" &&
      !hasReportQueued;

    let sendDisabledReason: string | undefined;
    if (!isOwnerOrAdmin) {
      sendDisabledReason = "Apenas owner/admin podem enviar relatórios.";
    } else if (evolutionStatus.state !== "active") {
      sendDisabledReason = "Configure a integração antes de enviar.";
    } else if (hasReportQueued && firstQueuedJob?.created_at) {
      const elapsedMs = Date.now() - new Date(firstQueuedJob.created_at).getTime();
      const elapsedMin = Math.max(1, Math.round(elapsedMs / 60_000));
      if (firstQueuedJob.status === "running") {
        sendDisabledReason = `Relatório em processamento há ${elapsedMin} min.`;
      } else {
        sendDisabledReason = `Relatório na fila há ${elapsedMin} min.`;
      }
    }

    const recentReports: RecentReportItem[] = ((reportsDoneResult.data ?? []) as Array<
      Pick<AsyncJobRow, "id" | "completed_at" | "payload" | "result" | "status" | "error_message">
    >).map((row) => {
      const resultObj =
        typeof row.result === "object" && row.result !== null && !Array.isArray(row.result)
          ? (row.result as Record<string, unknown>)
          : null;
      const deliveryFailed = resultObj?.deliveryStatus === "failed";
      const deliveryError =
        typeof resultObj?.deliveryError === "string" ? resultObj.deliveryError : null;

      let displayStatus: "done" | "failed" | "delivery_failed" = row.status as "done" | "failed";
      if (row.status === "done" && deliveryFailed) {
        displayStatus = "delivery_failed";
      }

      const pdfStoragePath =
        typeof resultObj?.pdfStoragePath === "string" ? resultObj.pdfStoragePath : null;

      return {
        id: row.id,
        completedAt: row.completed_at,
        reportText: parseReportText(row.payload, row.result),
        status: displayStatus,
        errorMessage: row.error_message ?? deliveryError,
        pdfStoragePath,
      };
    });

    const nextMonday = nextMondayAtEight(new Date());
    const nextSendAtLabel = formatNextSendLabel(nextMonday);
    const positiveSentimentRate =
      sentimentData.total > 0 ? Math.round((sentimentData.positive / sentimentData.total) * 100) : 0;

    const aiSummary = recommendations[0] ?? null;
    const executiveSummary =
      unresolvedNegativeCount > 0
        ? `${unresolvedNegativeCount} conversas críticas exigem retorno rápido. Priorize atendimento e estabilize o fluxo antes da próxima coleta.`
        : opportunitiesCurrent > 0
          ? `${opportunitiesCurrent} oportunidades com intenção de compra surgiram na última semana. O momento é bom para acelerar resposta comercial.`
          : postsPublishedCurrent > 0
            ? `${postsPublishedCurrent} posts já saíram e o radar encontrou ${viralCurrent} sinais virais. Há lastro suficiente para decidir os próximos experimentos.`
            : "Conecte integrações e alimente os módulos para transformar o dashboard em uma camada de decisão, não apenas de status.";

    const railStatus = alerts.length > 0 ? "Atenção imediata" : "Operação estável";

    return (
      <main
        className="dashboard-stage mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8"
        style={{ "--module-color": "#FA5E24", "--module-color-bg": "#FFF0EB" } as CSSProperties}
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
                <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                  {greeting}
                  {companyName ? `, ${companyName}` : ""}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                  {executiveSummary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="section-label">Conversas</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-text">
                    {conversationsCurrent.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 text-sm text-muted">última semana analisada</p>
                </div>
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="section-label">Sentimento positivo</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-text">
                    {positiveSentimentRate}%
                  </p>
                  <p className="mt-1 text-sm text-muted">sinal saudável no atendimento</p>
                </div>
                <div className="dashboard-panel rounded-2xl p-4">
                  <p className="section-label">Status operacional</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-text">
                    {alerts.length}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {alerts.length === 1 ? "ponto de atenção" : "pontos de atenção"}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-3">
                <Button asChild className="h-11 px-5 btn-glow">
                  <Link href="/whatsapp-intelligence">
                    Ver operação
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-11 px-5">
                  <Link href="/settings?tab=integrations">Revisar integrações</Link>
                </Button>
              </div>
            </div>

            <aside className="dashboard-panel relative z-[1] flex h-full flex-col justify-between gap-5 rounded-[24px] p-5">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Insight prioritário
                  </div>
                  <span className="text-xs text-muted">{railStatus}</span>
                </div>

                <h2 className="font-display text-2xl font-semibold text-text">
                  {aiSummary ? "Leitura da semana" : "Painel em calibração"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {aiSummary ??
                    "Ainda não há recomendação automática suficiente. Assim que o radar consolidar volume, este bloco passa a orientar a prioridade do time."}
                </p>

                {!aiSummary && (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/30 px-4 py-3.5">
                    <div className="flex shrink-0 items-end gap-[3px]">
                      {([11, 18, 14, 24, 17, 22, 15] as number[]).map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-sm bg-primary/50"
                          style={{ height: h }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text">Radar acumulando volume</p>
                      <p className="text-xs text-muted">
                        {conversationsCurrent.toLocaleString("pt-BR")} conversas coletadas
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {alerts.length > 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    )}
                    Monitoramento
                  </div>
                  <p className="mt-2 text-sm font-medium text-text">
                    {alerts.length > 0
                      ? `${alerts.length} alertas em aberto`
                      : "Nenhum alerta crítico agora"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    Integrações
                  </div>
                  <p className="mt-2 text-sm font-medium text-text">
                    {connectedIntegrationsCount}/{integrationStatusItems.length} conectadas
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    Próximo envio
                  </div>
                  <p className="mt-2 text-sm font-medium text-text">
                    {formatCompactDate(nextMonday)} às 08:00
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
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
                      ? "Conecte o Sofia CRM em Configurações para começar a sincronizar conversas."
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
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            {alerts.length > 0 ? (
              <AlertsCard alerts={alerts} />
            ) : (
              <section className="dashboard-panel rounded-[24px] p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-success-light">
                    <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="section-label">Controle de risco</p>
                    <h2 className="mt-1 text-lg font-semibold text-text">Tudo em dia</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Nenhum alerta crítico foi disparado agora. Use a lateral para validar integrações e relatórios.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <IntegrationsStatusCard integrations={integrationStatusItems} />

            <NextReportCard
              nextSendAtLabel={nextSendAtLabel}
              managerPhone={managerPhoneMasked}
              evolutionStatus={evolutionStatus}
              canManageReports={isOwnerOrAdmin}
              canSendNow={canSendNow}
              sendDisabledReason={sendDisabledReason}
            />

            <RecentReportsCard
              reports={recentReports}
              hasRunningJob={hasRunningReport}
              runningJobCreatedAt={runningJobCreatedAt}
            />
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
