/**
 * Arquivo: src/components/dashboard/dashboard-sidebar-section.tsx
 * Propósito: Seção lateral do dashboard carregada com Suspense independente.
 */

import { unstable_noStore as noStore } from "next/cache";
import { ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import {
  IntegrationsStatusCard,
  type IntegrationStatusItem,
} from "@/components/dashboard/integrations-status-card";
import { NextReportCard } from "@/components/dashboard/next-report-card";
import {
  RecentReportsCard,
  type RecentReportItem,
} from "@/components/dashboard/recent-reports-card";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type { Database, Json } from "@/database/types/database.types";

type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];
type AsyncJobRow = Database["public"]["Tables"]["async_jobs"]["Row"];

type IntegrationStatusRow = Pick<
  IntegrationRow,
  "type" | "is_active" | "test_status" | "last_tested_at" | "config"
>;

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

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***********";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} *****-${digits.slice(-4)}`;
}

function nextMondayAtEight(reference: Date) {
  const next = new Date(reference);
  next.setHours(8, 0, 0, 0);
  const day = reference.getDay();
  let daysUntilMonday = (8 - day) % 7;
  if (daysUntilMonday === 0 && reference >= next) daysUntilMonday = 7;
  next.setDate(reference.getDate() + daysUntilMonday);
  return next;
}

function formatNextSendLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  const capitalizedWeekday = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return `${capitalizedWeekday}, ${datePart} às 08:00`;
}

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) return [] as string[];
  return rawPlatforms
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

function toIntegrationStatusItems(
  rows: IntegrationStatusRow[],
  options?: { openRouterEnvEnabled?: boolean }
): IntegrationStatusItem[] {
  const byType = new Map(rows.map((row) => [row.type, row]));
  const allTypes: IntegrationStatusItem["type"][] = [
    "evo_crm",
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
  if (!row) return { state: "missing" as const, label: "Não configurado" };
  if (row.test_status === "ok" && row.is_active)
    return { state: "active" as const, label: "Evolution API ativa" };
  if (row.test_status === "error")
    return { state: "error" as const, label: "Evolution API com erro" };
  return { state: "missing" as const, label: "Não configurado" };
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
  isOwnerOrAdmin,
}: {
  companyId: string;
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
      .select("id, company_id, created_at, type, is_active, test_status, last_tested_at, config")
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
        .filter((value): value is string => typeof value === "string")
    )
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
      (conversationsData ?? []).map((item) => [item.id, item])
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
      insight.conversation_id ? unresolvedConversationIds.has(insight.conversation_id) : false
    );
    if (latestNegative?.conversation_id) {
      const latestConversation = conversationMap.get(latestNegative.conversation_id);
      const contactName = latestConversation?.contact_name ?? "Contato sem nome";
      latestNegativeConversationText = `Última: ${contactName} - ${formatRelativeTime(latestNegative.generated_at)}`;
    }
  }

  // Build alerts
  const alerts: DashboardAlert[] = [];
  const failedPosts = failedPostsResult.data ?? [];
  const failedPostsCount = failedPosts.length;
  const failedPlatforms = Array.from(
    new Set(
      failedPosts
        .flatMap((post) => extractPlatforms(post.platforms))
        .map((platform) => platform[0]?.toUpperCase() + platform.slice(1))
    )
  );

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
      description: failedPlatforms.length > 0 ? failedPlatforms.join(" · ") : "Verifique os canais e tente publicar novamente.",
      actionHref: "/social-publisher",
      actionLabel: "Ver posts",
    });
  }

  const integrations = (integrationsResult.data ?? []) as IntegrationRow[];
  integrations
    .filter((integration) => integration.test_status === "error")
    .forEach((integration) => {
      const integrationLabelByType: Record<IntegrationRow["type"], string> = {
        evo_crm: "Evo CRM",
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

  // Integrations status
  const openRouterEnvEnabled = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const integrationStatusItems = toIntegrationStatusItems(
    integrations as IntegrationStatusRow[],
    { openRouterEnvEnabled }
  );

  // Reports
  const reportQueue = (reportsQueueResult.data ?? []) as Pick<AsyncJobRow, "id" | "status" | "created_at">[];
  const hasReportQueued = reportQueue.length > 0;
  const hasRunningReport = reportQueue.some((job) => job.status === "running");
  const firstQueuedJob = reportQueue[0] ?? null;
  const runningJobCreatedAt = firstQueuedJob?.created_at ?? null;

  const evolutionIntegration = integrations.find((i) => i.type === "evolution_api");
  const evolutionStatus = resolveEvolutionDisplayStatus(evolutionIntegration);

  let managerPhoneMasked = "***********";
  try {
    if (evolutionIntegration?.config) {
      const evolutionConfig = decodeIntegrationConfig("evolution_api", evolutionIntegration.config);
      if (evolutionConfig.managerPhone) {
        managerPhoneMasked = maskPhone(evolutionConfig.managerPhone);
      }
    }
  } catch {
    managerPhoneMasked = "***********";
  }

  const canSendNow = isOwnerOrAdmin && evolutionStatus.state === "active" && !hasReportQueued;

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

  const nextMonday = nextMondayAtEight(new Date());
  const nextSendAtLabel = formatNextSendLabel(nextMonday);

  const recentReports: RecentReportItem[] = ((reportsDoneResult.data ?? []) as Array<
    Pick<AsyncJobRow, "id" | "completed_at" | "payload" | "result" | "status" | "error_message">
  >).map((row) => {
    const resultObj =
      typeof row.result === "object" && row.result !== null && !Array.isArray(row.result)
        ? (row.result as Record<string, unknown>)
        : null;
    const deliveryFailed = resultObj?.deliveryStatus === "failed";
    const deliveryError = typeof resultObj?.deliveryError === "string" ? resultObj.deliveryError : null;
    let displayStatus: "done" | "failed" | "delivery_failed" = row.status as "done" | "failed";
    if (row.status === "done" && deliveryFailed) displayStatus = "delivery_failed";
    const pdfStoragePath = typeof resultObj?.pdfStoragePath === "string" ? resultObj.pdfStoragePath : null;

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
    </>
  );
}
