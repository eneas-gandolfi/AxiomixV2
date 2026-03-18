/**
 * Arquivo: src/services/report/daily-generator.ts
 * Propósito: Agregar métricas diárias e gerar relatório de gargalos com IA.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import "server-only";

import { buildDailyReportPrompt, type DailyReportPromptInput } from "@/lib/ai/prompts/daily-report";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";

type DailyMetrics = {
  companyName: string;
  conversationsAnalyzed: number;
  purchaseIntents: number;
  negativeSentiments: number;
  topPurchaseContacts: string[];
  postsPublished: number;
  postsFailed: number;
  postsStuck: number;
  topViralContent: Array<{
    platform: string;
    engagementScore: number;
    content: string;
  }>;
  competitorInsightsCount: number;
  alertsSentByType: Record<string, number>;
  alertsFailed: number;
  failedJobsByType: Record<string, number>;
};

type DailyReportResult = {
  reportDate: string;
  reportText: string;
  metrics: DailyMetrics;
};

function resolveReportDate(reportDate?: string): string {
  if (reportDate) {
    return reportDate;
  }
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function resolve24hWindow(reportDate: string) {
  const start = `${reportDate}T00:00:00.000Z`;
  const end = `${reportDate}T23:59:59.999Z`;
  return { start, end };
}

function clampWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return `${words.slice(0, maxWords).join(" ")}.`;
}

function fallbackReportText(reportDate: string, metrics: DailyMetrics) {
  const contactsLine =
    metrics.topPurchaseContacts.length > 0
      ? metrics.topPurchaseContacts.join(", ")
      : "nenhum";

  const stuckLine =
    metrics.postsStuck > 0
      ? `⚠️ ${metrics.postsStuck} posts travados precisam de atenção.`
      : "";

  const failedLine =
    metrics.postsFailed > 0
      ? `⚠️ ${metrics.postsFailed} posts falharam na publicação.`
      : "";

  const text = `
📊 *Resumo diário — ${metrics.companyName}* (${reportDate})

WhatsApp: ${metrics.conversationsAnalyzed} conversas analisadas, ${metrics.purchaseIntents} intenções de compra (${contactsLine}), ${metrics.negativeSentiments} sentimentos negativos.
Redes sociais: ${metrics.postsPublished} publicados, ${metrics.postsFailed} falhados, ${metrics.postsStuck} travados.
${stuckLine}
${failedLine}
Inteligência: ${metrics.competitorInsightsCount} insights de concorrentes.
Alertas falhados: ${metrics.alertsFailed}.

💡 Verifique os itens com ⚠️ e priorize contatos com intenção de compra.
`.trim();

  return clampWords(text, 300);
}

async function collectDailyMetrics(companyId: string, reportDate: string): Promise<DailyMetrics> {
  const supabase = createSupabaseAdminClient();
  const { start, end } = resolve24hWindow(reportDate);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [
    companyResult,
    conversationsResult,
    purchaseIntentsResult,
    negativeSentimentsResult,
    topContactsResult,
    postsPublishedResult,
    postsFailedResult,
    postsStuckResult,
    viralContentResult,
    competitorInsightsResult,
    alertsResult,
    failedJobsResult,
  ] = await Promise.all([
    // 1. Nome da empresa
    supabase.from("companies").select("name").eq("id", companyId).single(),
    // 2. Total de conversas analisadas
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("generated_at", start)
      .lte("generated_at", end),
    // 3. Intenções de compra
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", start)
      .lte("generated_at", end),
    // 4. Sentimentos negativos
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("sentiment", "negativo")
      .gte("generated_at", start)
      .lte("generated_at", end),
    // 5. Top 3 contatos com intenção de compra (join com conversations)
    supabase
      .from("conversation_insights")
      .select("conversation_id, conversations!inner(contact_name)")
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", start)
      .lte("generated_at", end)
      .limit(3),
    // 6. Posts publicados
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "published")
      .gte("published_at", start)
      .lte("published_at", end),
    // 7. Posts falhados
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "failed")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end),
    // 8. Posts travados (scheduled há mais de 1h)
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "scheduled")
      .lt("scheduled_at", oneHourAgo),
    // 9. Top 2 conteúdo viral
    supabase
      .from("collected_posts")
      .select("platform, engagement_score, content")
      .eq("company_id", companyId)
      .eq("source_type", "radar")
      .gte("collected_at", start)
      .lte("collected_at", end)
      .order("engagement_score", { ascending: false })
      .limit(2),
    // 10. Insights de concorrentes
    supabase
      .from("intelligence_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("source_type", "competitor")
      .gte("generated_at", start)
      .lte("generated_at", end),
    // 11. Alertas enviados por tipo + falhados
    supabase
      .from("alert_log")
      .select("alert_type, status")
      .eq("company_id", companyId)
      .gte("sent_at", start)
      .lte("sent_at", end)
      .limit(1000),
    // 12. Jobs falhados por tipo
    supabase
      .from("async_jobs")
      .select("job_type")
      .eq("company_id", companyId)
      .eq("status", "failed")
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(500),
  ]);

  // Parse top purchase contacts
  const topPurchaseContacts: string[] = [];
  if (topContactsResult.data) {
    for (const row of topContactsResult.data) {
      const conv = row.conversations as unknown as { contact_name: string | null } | null;
      const name = conv?.contact_name;
      if (name) {
        topPurchaseContacts.push(name);
      }
    }
  }

  // Parse alerts by type
  const alertsSentByType: Record<string, number> = {};
  let alertsFailed = 0;
  if (alertsResult.data) {
    for (const alert of alertsResult.data) {
      if (alert.status === "failed") {
        alertsFailed += 1;
      } else if (alert.status === "sent") {
        alertsSentByType[alert.alert_type] = (alertsSentByType[alert.alert_type] ?? 0) + 1;
      }
    }
  }

  // Parse failed jobs by type
  const failedJobsByType: Record<string, number> = {};
  if (failedJobsResult.data) {
    for (const job of failedJobsResult.data) {
      failedJobsByType[job.job_type] = (failedJobsByType[job.job_type] ?? 0) + 1;
    }
  }

  // Parse viral content
  const topViralContent = (viralContentResult.data ?? []).map((post) => ({
    platform: post.platform ?? "desconhecida",
    engagementScore: post.engagement_score ?? 0,
    content: post.content ?? "Sem conteúdo",
  }));

  return {
    companyName: companyResult.data?.name ?? "Empresa",
    conversationsAnalyzed: conversationsResult.count ?? 0,
    purchaseIntents: purchaseIntentsResult.count ?? 0,
    negativeSentiments: negativeSentimentsResult.count ?? 0,
    topPurchaseContacts,
    postsPublished: postsPublishedResult.count ?? 0,
    postsFailed: postsFailedResult.count ?? 0,
    postsStuck: postsStuckResult.count ?? 0,
    topViralContent,
    competitorInsightsCount: competitorInsightsResult.count ?? 0,
    alertsSentByType,
    alertsFailed,
    failedJobsByType,
  };
}

export async function generateDailyReport(
  companyId: string,
  reportDate?: string
): Promise<DailyReportResult> {
  const date = resolveReportDate(reportDate);
  const metrics = await collectDailyMetrics(companyId, date);

  const kbContext = await getKnowledgeBaseContext(
    companyId,
    `gargalos operacionais gargalos comerciais perguntas de diagnóstico objeções compromisso próximo passo ${metrics.companyName}`,
    {
      includeGlobal: true,
    }
  );

  const promptInput: DailyReportPromptInput = {
    companyName: metrics.companyName,
    reportDate: date,
    conversationsAnalyzed: metrics.conversationsAnalyzed,
    purchaseIntents: metrics.purchaseIntents,
    negativeSentiments: metrics.negativeSentiments,
    topPurchaseContacts: metrics.topPurchaseContacts,
    postsPublished: metrics.postsPublished,
    postsFailed: metrics.postsFailed,
    postsStuck: metrics.postsStuck,
    topViralContent: metrics.topViralContent,
    competitorInsightsCount: metrics.competitorInsightsCount,
    alertsSentByType: metrics.alertsSentByType,
    alertsFailed: metrics.alertsFailed,
    failedJobsByType: metrics.failedJobsByType,
    knowledgeBaseContext: kbContext || undefined,
  };

  const prompt = buildDailyReportPrompt(promptInput);

  try {
    const aiText = await openRouterChatCompletion(
      companyId,
      [
        {
          role: "system",
          content: "Você gera texto puro em português para WhatsApp. Use *bold* para destaques.",
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
      reportDate: date,
      reportText: clampWords(aiText, 300),
      metrics,
    };
  } catch {
    return {
      reportDate: date,
      reportText: fallbackReportText(date, metrics),
      metrics,
    };
  }
}

export type { DailyMetrics, DailyReportResult };
