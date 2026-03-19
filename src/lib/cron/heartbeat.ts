/**
 * Arquivo: src/lib/cron/heartbeat.ts
 * Propósito: Orquestração unificada de cron jobs — consolida recover, process e sync.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recoverAllStaleJobs, markAllStaleJobsFailed, enqueueJob } from "@/lib/jobs/queue";
import { processJobs } from "@/lib/jobs/processor";

const MIN_SYNC_INTERVAL_MINUTES = 15;

type HeartbeatResult = {
  recovered: number;
  staleMarkedFailed: number;
  processed: number;
  synced: { enqueued: number; skippedRecent: number };
};

export async function runHeartbeat(): Promise<HeartbeatResult> {
  // 1. Recuperar jobs travados em running há mais de 5 min
  const recovered = await recoverAllStaleJobs(5);

  // 2. Marcar como failed jobs que passaram do limite (pending >10min, running >30min)
  const staleMarkedFailed = await markAllStaleJobsFailed();

  // 3. Processar até 5 jobs pendentes da fila
  const processingResult = await processJobs({ maxJobs: 5 });

  // 4. Enfileirar syncs pendentes para empresas ativas com Sofia CRM
  const synced = await enqueuePendingSyncs();

  return {
    recovered,
    staleMarkedFailed,
    processed: processingResult.processed,
    synced,
  };
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
