/**
 * Arquivo: src/services/report/generator.ts
 * Propósito: Agregar dados semanais dos módulos e gerar narrativa executiva com IA.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { buildWeeklyReportPrompt } from "@/lib/ai/prompts/weekly-report";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";

type WeeklyPeriod = {
  weekStartIso: string;
  weekEndIso: string;
};

type WeeklyMetrics = {
  companyName: string;
  conversationsAnalyzed: number;
  activeConversations: number;
  salesOpportunities: number;
  negativeSentiments: number;
  topPurchaseContacts: string[];
  digestSummaries: string[];
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
    : "No radar, não houve posts virais relevantes no período.";

  const purchaseNames =
    metrics.topPurchaseContacts.length > 0
      ? `Contatos com intenção de compra: ${metrics.topPurchaseContacts.join(", ")}.`
      : "";

  const negativeLine =
    metrics.negativeSentiments > 0
      ? ` ${metrics.negativeSentiments} sentimento(s) negativo(s) detectado(s) — verificar.`
      : "";

  const text = `
*Resumo da semana*: ${metrics.companyName} manteve operação ativa com foco em oportunidade comercial e consistência de publicação.
*WhatsApp*: ${metrics.activeConversations} conversas ativas, ${metrics.conversationsAnalyzed} analisadas pela IA, ${metrics.salesOpportunities} oportunidades de venda.${negativeLine}
${purchaseNames}
*Redes sociais*: ${metrics.postsPublished} posts publicados. ${metrics.socialPerformanceSummary}
*Concorrentes*: ${metrics.competitorSummary}
*Ação recomendada*: repetir o formato com melhor tração e reforçar CTA direto para WhatsApp em toda publicação da semana.
${bestRadarLine}
Período: ${period.weekStartIso} até ${period.weekEndIso}.
`.trim();

  return clampWords(text, 500);
}

async function collectWeeklyMetrics(companyId: string, period: WeeklyPeriod): Promise<WeeklyMetrics> {
  const supabase = createSupabaseAdminClient();
  const [
    { data: company },
    { data: digests },
    { count: activeConvCount },
    { data: purchaseInsights },
    { count: analyzedInsightsCount },
    { count: negativeInsightsCount },
    { data: publishedPosts },
    { data: radarPosts },
    { data: competitorInsights },
  ] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).single(),
    supabase
      .from("conversation_digests")
      .select("conversations_analyzed, purchase_intents, negative_sentiments, summary_text")
      .eq("company_id", companyId)
      .gte("period_start", period.weekStartIso)
      .lte("period_end", period.weekEndIso),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("last_message_at", period.weekStartIso)
      .lte("last_message_at", period.weekEndIso),
    supabase
      .from("conversation_insights")
      .select("conversation_id, conversations!inner(contact_name)")
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", period.weekStartIso)
      .lte("generated_at", period.weekEndIso),
    // Fallback: contar insights individuais gerados no período
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
      .eq("sentiment", "negativo")
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

  // Agregar dados dos digests + fallback para insights individuais
  const digestRows = digests ?? [];
  const digestAnalyzed = digestRows.reduce((sum, d) => sum + (d.conversations_analyzed ?? 0), 0);
  const digestSales = digestRows.reduce((sum, d) => sum + (d.purchase_intents ?? 0), 0);
  const digestNegative = digestRows.reduce((sum, d) => sum + (d.negative_sentiments ?? 0), 0);
  const digestSummaries = digestRows
    .map((d) => d.summary_text ?? "")
    .filter((s) => s.trim().length > 0);

  // Usar o maior entre digests e contagem direta de insights (cobre cenários sem batches)
  const purchaseRows = purchaseInsights ?? [];
  const conversationsAnalyzed = Math.max(digestAnalyzed, analyzedInsightsCount ?? 0);
  const salesOpportunities = Math.max(digestSales, purchaseRows.length);
  const negativeSentiments = Math.max(digestNegative, negativeInsightsCount ?? 0);

  // Contatos com intenção de compra (nomes únicos)
  const seenNames = new Set<string>();
  const topPurchaseContacts: string[] = [];
  for (const row of purchaseRows) {
    const conv = row.conversations as unknown as { contact_name: string | null };
    const name = conv?.contact_name;
    if (name && !seenNames.has(name)) {
      seenNames.add(name);
      topPurchaseContacts.push(name);
    }
    if (topPurchaseContacts.length >= 10) break;
  }

  const postsPublished = (publishedPosts ?? []).length;
  const totalOkPlatforms = (publishedPosts ?? []).reduce((total, post) => {
    return total + parseProgressOkCount(post.progress);
  }, 0);
  const avgOkPlatforms = postsPublished > 0 ? (totalOkPlatforms / postsPublished).toFixed(1) : "0.0";
  const socialPerformanceSummary =
    postsPublished > 0
      ? `Média técnica de ${avgOkPlatforms} plataformas com publicação ok por post.`
      : "Não houve publicações concluídas no período.";

  const topRadarPosts = (radarPosts ?? []).map((post) => ({
    platform: post.platform ?? "desconhecida",
    engagementScore: post.engagement_score ?? 0,
    content: post.content ?? "Sem conteúdo",
  }));

  const competitorSummary =
    (competitorInsights ?? [])
      .map((item) => item.content ?? "")
      .filter((line) => line.trim().length > 0)
      .join(" ")
      .slice(0, 360) || "Sem novos insights de concorrentes na semana.";

  return {
    companyName: company?.name ?? "Empresa",
    conversationsAnalyzed,
    activeConversations: activeConvCount ?? 0,
    salesOpportunities,
    negativeSentiments,
    topPurchaseContacts,
    digestSummaries,
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
  const kbContext = await getKnowledgeBaseContext(
    companyId,
    `objetivos metas estratégia ${metrics.companyName}`
  );
  const prompt = buildWeeklyReportPrompt({
    companyName: metrics.companyName,
    weekStartIso: period.weekStartIso,
    weekEndIso: period.weekEndIso,
    conversationsAnalyzed: metrics.conversationsAnalyzed,
    activeConversations: metrics.activeConversations,
    salesOpportunities: metrics.salesOpportunities,
    negativeSentiments: metrics.negativeSentiments,
    topPurchaseContacts: metrics.topPurchaseContacts,
    digestSummaries: metrics.digestSummaries,
    postsPublished: metrics.postsPublished,
    socialPerformanceSummary: metrics.socialPerformanceSummary,
    topRadarPosts: metrics.topRadarPosts,
    competitorSummary: metrics.competitorSummary,
    knowledgeBaseContext: kbContext || undefined,
  });

  try {
    const aiText = await openRouterChatCompletion(
      companyId,
      [
        {
          role: "system",
          content: "Você gera texto em português formatado para WhatsApp. Use *negrito* para destaques. Sem markdown, sem emojis excessivos.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        responseFormat: "text",
        temperature: 0.3,
        module: "reports",
        operation: "generate_weekly",
      }
    );

    return {
      period,
      reportText: clampWords(aiText, 500),
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
