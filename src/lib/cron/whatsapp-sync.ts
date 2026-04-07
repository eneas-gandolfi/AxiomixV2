/**
 * Arquivo: src/lib/cron/whatsapp-sync.ts
 * Proposito: Logica do cron de sync WhatsApp/Sofia CRM (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

const MIN_SYNC_INTERVAL_MINUTES = 15;

export async function runWhatsappSyncCron() {
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
