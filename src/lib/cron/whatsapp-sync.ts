/**
 * Arquivo: src/lib/cron/whatsapp-sync.ts
 * Propósito: Cron de reconciliação WhatsApp/Evo CRM (safety net).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 *
 * NOTA: A partir da F1 (webhook-driven sync), este cron NÃO é mais a fonte
 * primária de dados. Os webhooks do Evo CRM alimentam o Supabase em tempo real.
 * Este cron roda de hora em hora como safety net e só enfileira sync quando
 * detecta drift: nenhum evento de webhook recente (conversations.last_synced_at
 * é atualizado a cada evento — webhook saudável dispensa reconciliação).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

const MIN_SYNC_INTERVAL_MINUTES = 55;
/** Sem evento de webhook há mais que isso = possível drift → reconciliar. */
const WEBHOOK_DRIFT_MINUTES = 30;

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
    return { enqueued: 0, skippedRecent: 0, skippedHealthy: 0 };
  }

  let enqueued = 0;
  let skippedRecent = 0;
  let skippedHealthy = 0;
  const driftCutoff = new Date(Date.now() - WEBHOOK_DRIFT_MINUTES * 60_000).toISOString();

  for (const companyId of companyIds) {
    // Webhook saudável? Se algum evento chegou recentemente, não há drift e a
    // reconciliação completa (cara: lista conversas + mensagens no Evo) é
    // dispensada. Empresas sem NENHUMA conversa ainda sincronizam normalmente
    // (primeira carga).
    const { data: recentWebhookActivity } = await supabase
      .from("conversations")
      .select("id")
      .eq("company_id", companyId)
      .gte("last_synced_at", driftCutoff)
      .limit(1);

    if (recentWebhookActivity && recentWebhookActivity.length > 0) {
      skippedHealthy += 1;
      continue;
    }

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

  return { enqueued, skippedRecent, skippedHealthy };
}
