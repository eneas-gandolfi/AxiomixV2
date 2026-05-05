/**
 * Arquivo: src/components/dashboard/dashboard-sidebar-section.tsx
 * Propósito: Seção lateral do dashboard carregada com Suspense independente.
 *            Mostra alertas críticos (ou "Tudo em dia") + relatórios recentes.
 *            "Status das integrações" e "Próximo relatório semanal" foram
 *            movidos pra Configurações — eram setup/plumbing, não decisão.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import { unstable_noStore as noStore } from "next/cache";
import { ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import {
  RecentReportsCard,
  type RecentReportItem,
} from "@/components/dashboard/recent-reports-card";
import type { Database, Json } from "@/database/types/database.types";

type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];
type AsyncJobRow = Database["public"]["Tables"]["async_jobs"]["Row"];

const DAY_MS = 86_400_000;

function formatRelativeTime(value: string | null) {
  if (!value) return "agora";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60_000), 0);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) return [] as string[];
  return rawPlatforms
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

function parseReportText(payload: Json | null, fallback?: Json | null) {
  const parseObject = (value?: Json | null) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value;
  };
  const resultObject = parseObject(fallback);
  if (resultObject) {
    const text = resultObject.reportText ?? resultObject.report_text;
    if (typeof text === "string" && text.trim().length > 0) return text;
  }
  const payloadObject = parseObject(payload);
  if (payloadObject) {
    const text = payloadObject.reportText ?? payloadObject.report_text;
    if (typeof text === "string" && text.trim().length > 0) return text;
  }
  return "Relatório sem conteúdo disponível.";
}

export async function DashboardSidebarSection({
  companyId,
  isOwnerOrAdmin: _isOwnerOrAdmin,
}: {
  companyId: string;
  /**
   * Mantido na API por compatibilidade — anteriormente usado pelo
   * NextReportCard pra decidir se o botão "Enviar agora" aparecia.
   * O card foi movido pra Configurações; o flag continua aqui pra não
   * quebrar o callsite enquanto a refatoração avança.
   */
  isOwnerOrAdmin: boolean;
}) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const nowIso = now.toISOString();
  const fortyEightHoursAgoIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [
    negativeInsightsResult,
    integrationsResult,
    failedPostsResult,
    reportsDoneResult,
    reportsQueueResult,
  ] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("conversation_id, generated_at")
      .eq("company_id", companyId)
      .eq("sentiment", "negativo")
      .gte("generated_at", fortyEightHoursAgoIso)
      .order("generated_at", { ascending: false }),
    supabase
      .from("integrations")
      .select("id, company_id, type, is_active, test_status, last_tested_at")
      .eq("company_id", companyId),
    supabase
      .from("scheduled_posts")
      .select("id, platforms, created_at")
      .eq("company_id", companyId)
      .eq("status", "failed")
      .gte("created_at", sevenDaysAgoIso)
      .lte("created_at", nowIso),
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

  // Negative conversations resolution
  const negativeInsights = negativeInsightsResult.data ?? [];
  const uniqueConversationIds = Array.from(
    new Set(
      negativeInsights
        .map((item) => item.conversation_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  let unresolvedNegativeCount = 0;
  let latestNegativeConversationText = "";

  if (uniqueConversationIds.length > 0) {
    const { data: conversationsData } = await supabase
      .from("conversations")
      .select("id, status, contact_name")
      .eq("company_id", companyId)
      .in("id", uniqueConversationIds);

    const conversationMap = new Map(
      (conversationsData ?? []).map((item) => [item.id, item]),
    );

    const unresolvedConversationIds = new Set<string>();
    for (const insight of negativeInsights) {
      if (!insight.conversation_id) continue;
      const conversation = conversationMap.get(insight.conversation_id);
      const isResolved = conversation?.status?.toLowerCase().trim() === "resolved";
      if (!isResolved) unresolvedConversationIds.add(insight.conversation_id);
    }

    unresolvedNegativeCount = unresolvedConversationIds.size;

    const latestNegative = negativeInsights.find((insight) =>
      insight.conversation_id ? unresolvedConversationIds.has(insight.conversation_id) : false,
    );
    if (latestNegative?.conversation_id) {
      const latestConversation = conversationMap.get(latestNegative.conversation_id);
      const contactName = latestConversation?.contact_name ?? "Contato sem nome";
      latestNegativeConversationText = `Última: ${contactName} - ${formatRelativeTime(latestNegative.generated_at)}`;
    }
  }

  // Build alerts — integrações continuam sendo monitoradas:
  // verde = silencioso, vermelho = alerta acionável aqui.
  const alerts: DashboardAlert[] = [];
  const failedPosts = failedPostsResult.data ?? [];
  const failedPostsCount = failedPosts.length;
  const failedPlatforms = Array.from(
    new Set(
      failedPosts
        .flatMap((post) => extractPlatforms(post.platforms))
        .map((platform) => platform[0]?.toUpperCase() + platform.slice(1)),
    ),
  );

  if (unresolvedNegativeCount > 0) {
    alerts.push({
      id: "negative-conversations",
      variant: "danger",
      title: `${unresolvedNegativeCount} conversas negativas sem resposta`,
      description:
        latestNegativeConversationText ||
        "Há conversas críticas aguardando retorno.",
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

  const integrations = (integrationsResult.data ?? []) as Pick<
    IntegrationRow,
    "id" | "company_id" | "type" | "is_active" | "test_status" | "last_tested_at"
  >[];

  const integrationLabelByType: Record<IntegrationRow["type"], string> = {
    evo_crm: "Evo CRM",
    evolution_api: "Evolution API",
    upload_post: "Upload-Post API",
    openrouter: "OpenRouter",
  };

  integrations
    .filter((integration) => integration.test_status === "error")
    .forEach((integration) => {
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

  // Recent reports — seguem aqui (é conteúdo, não config).
  const reportQueue = (reportsQueueResult.data ?? []) as Pick<
    AsyncJobRow,
    "id" | "status" | "created_at"
  >[];
  const hasRunningReport = reportQueue.some((job) => job.status === "running");
  const runningJobCreatedAt = reportQueue[0]?.created_at ?? null;

  const recentReports: RecentReportItem[] = (
    (reportsDoneResult.data ?? []) as Array<
      Pick<
        AsyncJobRow,
        "id" | "completed_at" | "payload" | "result" | "status" | "error_message"
      >
    >
  ).map((row) => {
    const resultObj =
      typeof row.result === "object" && row.result !== null && !Array.isArray(row.result)
        ? (row.result as Record<string, unknown>)
        : null;
    const deliveryFailed = resultObj?.deliveryStatus === "failed";
    const deliveryError =
      typeof resultObj?.deliveryError === "string" ? resultObj.deliveryError : null;
    let displayStatus: "done" | "failed" | "delivery_failed" = row.status as "done" | "failed";
    if (row.status === "done" && deliveryFailed) displayStatus = "delivery_failed";
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

  return (
    <>
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
                Nenhum alerta crítico ativo. Sistema saudável, nada exigindo
                sua intervenção.
              </p>
            </div>
          </div>
        </section>
      )}

      <RecentReportsCard
        reports={recentReports}
        hasRunningJob={hasRunningReport}
        runningJobCreatedAt={runningJobCreatedAt}
      />
    </>
  );
}
