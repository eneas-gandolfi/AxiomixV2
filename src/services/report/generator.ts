/**
 * Arquivo: src/services/report/generator.ts
 * Proposito: Agregar dados semanais dos modulos e gerar narrativa executiva com IA.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { buildWeeklyReportPrompt } from "@/lib/ai/prompts/weekly-report";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type WeeklyPeriod = {
  weekStartIso: string;
  weekEndIso: string;
};

type WeeklyMetrics = {
  companyName: string;
  conversationsAnalyzed: number;
  salesOpportunities: number;
  postsPublished: number;
  socialPerformanceSummary: string;
  topRadarPosts: Array<{
    platform: string;
    engagementScore: number;
    content: string;
  }>;
  competitorSummary: string;
};

type WeeklyReportResult = {
  period: WeeklyPeriod;
  reportText: string;
  metrics: WeeklyMetrics;
};

function toIsoDayStart(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  return day.toISOString();
}

function toIsoDayEnd(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return day.toISOString();
}

function startOfWeekMondayUtc(referenceDate: Date) {
  const dayOfWeek = referenceDate.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setUTCDate(referenceDate.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function resolvePreviousWeekPeriod(referenceDate?: Date): WeeklyPeriod {
  const now = referenceDate ?? new Date();
  const currentWeekStart = startOfWeekMondayUtc(now);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1);

  return {
    weekStartIso: toIsoDayStart(previousWeekStart),
    weekEndIso: toIsoDayEnd(previousWeekEnd),
  };
}

function clampWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return `${words.slice(0, maxWords).join(" ")}.`;
}

function parseProgressOkCount(raw: unknown) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return 0;
  }

  let okCount = 0;
  for (const value of Object.values(raw)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }
    const status = (value as Record<string, unknown>).status;
    if (status === "ok") {
      okCount += 1;
    }
  }
  return okCount;
}

function fallbackReportText(period: WeeklyPeriod, metrics: WeeklyMetrics) {
  const bestRadar = metrics.topRadarPosts[0];
  const bestRadarLine = bestRadar
    ? `No radar, destaque para ${bestRadar.platform} com score ${bestRadar.engagementScore}.`
    : "No radar, nao houve posts virais relevantes no periodo.";

  const text = `
Destaque da semana: ${metrics.companyName} manteve operacao ativa com foco em oportunidade comercial e consistencia de publicacao.
WhatsApp: ${metrics.conversationsAnalyzed} conversas analisadas e ${metrics.salesOpportunities} oportunidades de venda identificadas.
Redes sociais: ${metrics.postsPublished} posts publicados. ${metrics.socialPerformanceSummary}
Concorrentes: ${metrics.competitorSummary}
Acao recomendada: repetir o formato com melhor tracao e reforcar CTA direto para WhatsApp em toda publicacao da semana.
${bestRadarLine}
Periodo: ${period.weekStartIso} ate ${period.weekEndIso}.
`.trim();

  return clampWords(text, 400);
}

async function collectWeeklyMetrics(companyId: string, period: WeeklyPeriod): Promise<WeeklyMetrics> {
  const supabase = createSupabaseAdminClient();
  const [{ data: company }, { count: conversationCount }, { count: opportunitiesCount }, { data: publishedPosts }, { data: radarPosts }, { data: competitorInsights }] =
    await Promise.all([
      supabase.from("companies").select("name").eq("id", companyId).single(),
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("generated_at", period.weekStartIso)
        .lte("generated_at", period.weekEndIso),
      supabase
        .from("conversation_insights")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("intent", "compra")
        .gte("generated_at", period.weekStartIso)
        .lte("generated_at", period.weekEndIso),
      supabase
        .from("scheduled_posts")
        .select("id, progress, post_type")
        .eq("company_id", companyId)
        .in("status", ["published", "partial"])
        .gte("published_at", period.weekStartIso)
        .lte("published_at", period.weekEndIso),
      supabase
        .from("collected_posts")
        .select("platform, engagement_score, content")
        .eq("company_id", companyId)
        .eq("source_type", "radar")
        .gte("collected_at", period.weekStartIso)
        .lte("collected_at", period.weekEndIso)
        .order("engagement_score", { ascending: false })
        .limit(3),
      supabase
        .from("intelligence_insights")
        .select("content")
        .eq("company_id", companyId)
        .eq("source_type", "competitor")
        .gte("generated_at", period.weekStartIso)
        .lte("generated_at", period.weekEndIso)
        .order("generated_at", { ascending: false })
        .limit(3),
    ]);

  const postsPublished = (publishedPosts ?? []).length;
  const totalOkPlatforms = (publishedPosts ?? []).reduce((total, post) => {
    return total + parseProgressOkCount(post.progress);
  }, 0);
  const avgOkPlatforms = postsPublished > 0 ? (totalOkPlatforms / postsPublished).toFixed(1) : "0.0";
  const socialPerformanceSummary =
    postsPublished > 0
      ? `Media tecnica de ${avgOkPlatforms} plataformas com publicacao ok por post.`
      : "Nao houve publicacoes concluidas no periodo.";

  const topRadarPosts = (radarPosts ?? []).map((post) => ({
    platform: post.platform ?? "desconhecida",
    engagementScore: post.engagement_score ?? 0,
    content: post.content ?? "Sem conteudo",
  }));

  const competitorSummary =
    (competitorInsights ?? [])
      .map((item) => item.content ?? "")
      .filter((line) => line.trim().length > 0)
      .join(" ")
      .slice(0, 360) || "Sem novos insights de concorrentes na semana.";

  return {
    companyName: company?.name ?? "Empresa",
    conversationsAnalyzed: conversationCount ?? 0,
    salesOpportunities: opportunitiesCount ?? 0,
    postsPublished,
    socialPerformanceSummary,
    topRadarPosts,
    competitorSummary,
  };
}

export async function generateWeeklyReport(
  companyId: string,
  periodInput?: Partial<WeeklyPeriod>
): Promise<WeeklyReportResult> {
  const defaultPeriod = resolvePreviousWeekPeriod();
  const period: WeeklyPeriod = {
    weekStartIso: periodInput?.weekStartIso ?? defaultPeriod.weekStartIso,
    weekEndIso: periodInput?.weekEndIso ?? defaultPeriod.weekEndIso,
  };

  const metrics = await collectWeeklyMetrics(companyId, period);
  const prompt = buildWeeklyReportPrompt({
    companyName: metrics.companyName,
    weekStartIso: period.weekStartIso,
    weekEndIso: period.weekEndIso,
    conversationsAnalyzed: metrics.conversationsAnalyzed,
    salesOpportunities: metrics.salesOpportunities,
    postsPublished: metrics.postsPublished,
    socialPerformanceSummary: metrics.socialPerformanceSummary,
    topRadarPosts: metrics.topRadarPosts,
    competitorSummary: metrics.competitorSummary,
  });

  try {
    const aiText = await openRouterChatCompletion(
      companyId,
      [
        {
          role: "system",
          content: "Voce gera texto puro em portugues, sem markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        responseFormat: "text",
        temperature: 0.3,
      }
    );

    return {
      period,
      reportText: clampWords(aiText, 400),
      metrics,
    };
  } catch {
    return {
      period,
      reportText: fallbackReportText(period, metrics),
      metrics,
    };
  }
}

export type { WeeklyPeriod, WeeklyMetrics, WeeklyReportResult };
