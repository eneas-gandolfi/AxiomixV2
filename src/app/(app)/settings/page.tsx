/**
 * Arquivo: src/app/(app)/settings/page.tsx
 * Propósito: Página de configurações com layout profissional e tabs
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import type React from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layouts/page-container";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type { UploadPostConfig } from "@/lib/integrations/types";
import type { IntegrationStatusItem } from "@/components/dashboard/integrations-status-card";
import type { RecentReportItem } from "@/components/dashboard/recent-reports-card";
import type { Json } from "@/database/types/database.types";
import { markStaleJobsFailed } from "@/lib/jobs/queue";

function decodeUploadPostFallback(config: unknown): UploadPostConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return {};
  }

  const raw = config as Record<string, unknown>;
  const rawConnections = Array.isArray(raw.social_connections)
    ? raw.social_connections
    : Array.isArray(raw.socialConnections)
      ? raw.socialConnections
      : [];

  return {
    socialConnections: rawConnections
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) return null;
        const conn = entry as Record<string, unknown>;
        const platform = conn.platform;
        if (platform !== "instagram" && platform !== "linkedin" && platform !== "tiktok") {
          return null;
        }
        return {
          id: typeof conn.id === "string" ? conn.id : crypto.randomUUID(),
          platform: platform as "instagram" | "linkedin" | "tiktok",
          status: (conn.status === "connected" || conn.status === "error" || conn.status === "pending"
            ? conn.status
            : "pending") as "connected" | "error" | "pending",
          externalConnectionId: null,
          accountName: null,
          connectUrl: null,
          connectedAt: null,
          lastError: null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  };
}

function decodeUploadPost(config: unknown): UploadPostConfig {
  try {
    return decodeIntegrationConfig("upload_post", config as never);
  } catch {
    return decodeUploadPostFallback(config);
  }
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
    return "●●●●●●●●●●●";
  }
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ●●●●●-${digits.slice(-4)}`;
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

type IntegrationRowForStatus = {
  type: "sofia_crm" | "evolution_api" | "upload_post" | "openrouter";
  is_active: boolean | null;
  test_status: string | null;
  last_tested_at: string | null;
  config: Json | null;
};

function toIntegrationStatusItems(
  rows: IntegrationRowForStatus[],
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

function resolveEvolutionDisplayStatus(row: IntegrationRowForStatus | undefined) {
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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  const companyId = await getUserCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  // Get user role for report permissions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole = "member";
  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    userRole = membership?.role ?? "member";
  }

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // Limpar jobs stale antes de consultar a fila (libera o botão se job travou)
  await markStaleJobsFailed(companyId);

  const [
    companyResult,
    integrationsResult,
    integrationsFullResult,
    reportsDoneResult,
    reportsQueueResult,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, niche, logo_url, created_at")
      .eq("id", companyId)
      .maybeSingle(),
    // Lightweight integrations for overview stats
    supabase
      .from("integrations")
      .select("type, is_active, config")
      .eq("company_id", companyId),
    // Full integrations for Reports tab
    supabase
      .from("integrations")
      .select("type, is_active, test_status, last_tested_at, config")
      .eq("company_id", companyId),
    // Recent completed reports (including failed)
    supabase
      .from("async_jobs")
      .select("id, completed_at, payload, result, status, error_message")
      .eq("company_id", companyId)
      .eq("job_type", "weekly_report")
      .in("status", ["done", "failed"])
      .order("completed_at", { ascending: false })
      .limit(4),
    // Report queue status (ignorar jobs travados com mais de 30 min)
    supabase
      .from("async_jobs")
      .select("id, status, created_at")
      .eq("company_id", companyId)
      .eq("job_type", "weekly_report")
      .in("status", ["pending", "running"])
      .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString()),
  ]);

  const company = companyResult.data;
  const integrations = integrationsResult.data;
  const integrationsFull = integrationsFullResult.data ?? [];
  const openRouterEnvEnabled = Boolean(process.env.OPENROUTER_API_KEY?.trim());

  // Count active integrations
  const activeIntegrations = integrations?.filter((i) => i.is_active).length ?? 0;
  const totalIntegrations = 2; // Sofia CRM + Evolution API

  // Count social connections
  const uploadPostIntegration = integrations?.find((i) => i.type === "upload_post");
  let socialConnections = 0;

  if (uploadPostIntegration?.config) {
    const decoded = decodeUploadPost(uploadPostIntegration.config);
    socialConnections = decoded.socialConnections?.filter((c) => c.status === "connected").length ?? 0;
  }

  const totalSocialPlatforms = 3; // Instagram, LinkedIn, TikTok

  // Company is configured if it has name and niche
  const companyConfigured = Boolean(company?.name && company?.niche);

  const initialStats = {
    companyConfigured,
    socialConnections,
    totalSocialPlatforms,
    integrationsActive: activeIntegrations,
    totalIntegrations,
    lastUpdate: company?.created_at ?? null,
  };

  // ── Reports tab data ──

  const integrationStatusItems = toIntegrationStatusItems(integrationsFull, {
    openRouterEnvEnabled,
  });
  const evolutionIntegration = integrationsFull.find((i) => i.type === "evolution_api");
  const evolutionStatus = resolveEvolutionDisplayStatus(evolutionIntegration);

  let managerPhoneMasked = "●●●●●●●●●●●";
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
    managerPhoneMasked = "●●●●●●●●●●●";
  }

  const reportQueue = reportsQueueResult.data ?? [];
  const hasReportQueued = reportQueue.length > 0;
  const hasRunningReport = reportQueue.some((job) => job.status === "running");
  const firstQueuedJob = reportQueue[0] ?? null;
  const runningJobCreatedAt = firstQueuedJob?.created_at ?? null;

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

  const doneReportsRows = reportsDoneResult.data ?? [];
  const recentReports: RecentReportItem[] = doneReportsRows.map((row) => {
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

    return {
      id: row.id,
      completedAt: row.completed_at,
      reportText: parseReportText(row.payload, row.result),
      status: displayStatus,
      errorMessage: row.error_message ?? deliveryError,
    };
  });

  const now = new Date();
  const nextMonday = nextMondayAtEight(now);
  const nextSendAtLabel = formatNextSendLabel(nextMonday);

  const reportData = {
    integrations: integrationStatusItems,
    nextSendAtLabel,
    managerPhone: managerPhoneMasked,
    evolutionStatus,
    canManageReports: isOwnerOrAdmin,
    canSendNow,
    sendDisabledReason,
    recentReports,
    hasRunningJob: hasRunningReport,
    runningJobCreatedAt,
  };

  return (
    <div style={{ '--module-color': '#8A8A8A', '--module-color-bg': '#F1F5F9' } as React.CSSProperties}>
    <PageContainer
      title=""
      description=""
    >
      <SettingsLayout initialStats={initialStats} reportData={reportData} initialTab={tabParam as "overview" | "company" | "integrations" | "social" | "reports" | "alerts" | undefined} />
    </PageContainer>
    </div>
  );
}
