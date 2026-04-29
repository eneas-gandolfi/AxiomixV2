/**
 * Arquivo: src/lib/cron/whatsapp-sync.ts
 * Propósito: Cron de reconciliação WhatsApp/Evo CRM (safety net).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 *
 * NOTA: A partir da F1 (webhook-driven sync), este cron NÃO é mais a fonte
 * primária de dados. Os webhooks do Evo CRM alimentam o Supabase em tempo real.
 * Este cron roda a cada 10-15 minutos como safety net para capturar eventos
 * que o webhook eventualmente perdeu (falha de rede, downtime).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

const MIN_SYNC_INTERVAL_MINUTES = 10;

export async function runWhatsappSyncCron() {
  const supabase = createSupabaseAdminClient();
  const recentSyncCutoff = new Date(Date.now() - MIN_SYNC_INTERVAL_MINUTES * 60_000).toISOString();

  const { data: integrations, error: integrationsError } = await supabase
    .from("integrations")
    .select("company_id")
    .eq("type", "evo_crm")
    .eq("is_active", true)
    .eq("test_status", "ok")
    .not("company_id", "is", null);

  if (integrationsError) {
    throw new Error(`Falha ao buscar integrações do Evo CRM: ${integrationsError.message}`);
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
      .eq("job_type", "evo_crm_sync")
      .in("status", ["pending", "running"])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      continue;
    }

    const { data: recentCompletedJobs } = await supabase
      .from("async_jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_type", "evo_crm_sync")
      .eq("status", "done")
      .gte("created_at", recentSyncCutoff)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentCompletedJobs && recentCompletedJobs.length > 0) {
      skippedRecent += 1;
      continue;
    }

    await enqueueJob("evo_crm_sync", {}, companyId, undefined, 1);
    enqueued += 1;
  }

  return { enqueued, skippedRecent };
}
