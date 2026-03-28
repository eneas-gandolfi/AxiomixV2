/**
 * Arquivo: src/lib/cron/heartbeat.ts
 * Propósito: Orquestração unificada de cron jobs — consolida recover, process e sync.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recoverAllStaleJobs, markAllStaleJobsFailed, enqueueJob } from "@/lib/jobs/queue";
import { enqueueAutoAnalyses } from "@/services/whatsapp/auto-analyze";
import { aggregateUsageForDate } from "@/services/usage/aggregate";

const MIN_SYNC_INTERVAL_MINUTES = 15;

type HeartbeatResult = {
  recovered: number;
  staleMarkedFailed: number;
  autoAnalyses: { companies: number; totalEnqueued: number; errors: number };
  synced: { enqueued: number; skippedRecent: number };
  usageAggregated: number;
};

export async function runHeartbeat(): Promise<HeartbeatResult> {
  // 1. Recuperar jobs travados em running há mais de 5 min
  const recovered = await recoverAllStaleJobs(5);

  // 2. Marcar como failed jobs que passaram do limite (pending >10min, running >30min)
  const staleMarkedFailed = await markAllStaleJobsFailed();

  // 3. Enfileirar análises automáticas para todas as empresas ativas
  const autoAnalyses = await enqueueAutoAnalysesForAllCompanies();

  // 4. Enfileirar syncs pendentes para empresas ativas com Sofia CRM
  const synced = await enqueuePendingSyncs();

  // 5. Agregar uso de IA do dia anterior (roda apenas no primeiro heartbeat de cada hora)
  let usageAggregated = 0;
  if (new Date().getMinutes() === 0) {
    try {
      usageAggregated = await aggregateUsageForDate();
    } catch (error) {
      console.error("[heartbeat] Falha na agregação de uso de IA:", error);
    }
  }

  return {
    recovered,
    staleMarkedFailed,
    autoAnalyses,
    synced,
    usageAggregated,
  };
}

async function enqueueAutoAnalysesForAllCompanies(): Promise<{
  companies: number;
  totalEnqueued: number;
  errors: number;
}> {
  const supabase = createSupabaseAdminClient();

  const { data: integrations, error: integrationsError } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("type", "sofia_crm")
    .eq("is_active", true)
    .eq("test_status", "ok")
    .not("company_id", "is", null);

  if (integrationsError) {
    throw new Error(`Falha ao buscar integrações para auto-análise: ${integrationsError.message}`);
  }

  const companyIds = Array.from(
    new Set(
      (integrations ?? [])
        .map((i) => i.company_id)
        .filter((id): id is string => typeof id === "string")
    )
  );

  if (companyIds.length === 0) {
    return { companies: 0, totalEnqueued: 0, errors: 0 };
  }

  let totalEnqueued = 0;
  let errors = 0;

  for (const companyId of companyIds) {
    try {
      const result = await enqueueAutoAnalyses(companyId);
      totalEnqueued += result.enqueuedAnalyses;
    } catch (error) {
      errors += 1;
      console.error(`Falha ao enfileirar auto-análises para company ${companyId}:`, error);
    }
  }

  return { companies: companyIds.length, totalEnqueued, errors };
}

async function enqueuePendingSyncs(): Promise<{ enqueued: number; skippedRecent: number }> {
  const supabase = createSupabaseAdminClient();
  const recentSyncCutoff = new Date(Date.now() - MIN_SYNC_INTERVAL_MINUTES * 60_000).toISOString();

  const { data: integrations, error: integrationsError } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("type", "sofia_crm")
    .eq("is_active", true)
    .eq("test_status", "ok")
    .not("company_id", "is", null);

  if (integrationsError) {
    throw new Error(`Falha ao buscar integrações do Sofia CRM: ${integrationsError.message}`);
  }

  const companyIds = Array.from(
    new Set(
      (integrations ?? [])
        .map((integration) => integration.company_id)
        .filter((companyId): companyId is string => typeof companyId === "string")
    )
  );

  if (companyIds.length === 0) {
    return { enqueued: 0, skippedRecent: 0 };
  }

  let enqueued = 0;
  let skippedRecent = 0;

  for (const companyId of companyIds) {
    const { data: existingJobs } = await supabase
      .from("async_jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_type", "sofia_crm_sync")
      .in("status", ["pending", "running"])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      continue;
    }

    const { data: recentCompletedJobs } = await supabase
      .from("async_jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_type", "sofia_crm_sync")
      .eq("status", "done")
      .gte("created_at", recentSyncCutoff)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentCompletedJobs && recentCompletedJobs.length > 0) {
      skippedRecent += 1;
      continue;
    }

    await enqueueJob("sofia_crm_sync", {}, companyId, undefined, 1);
    enqueued += 1;
  }

  return { enqueued, skippedRecent };
}
