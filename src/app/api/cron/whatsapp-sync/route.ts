/**
 * Arquivo: src/app/api/cron/whatsapp-sync/route.ts
 * Propósito: Cron job para sincronizar conversas do Evo CRM em background.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { isCronAuthorized } from "@/lib/auth/cron-auth";

export const dynamic = "force-dynamic";

const MIN_SYNC_INTERVAL_MINUTES = 15;

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

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
      return NextResponse.json({
        message: "Nenhuma empresa ativa para sincronizar.",
        enqueued: 0,
        skippedRecent: 0,
      });
    }

    const enqueued: string[] = [];
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

      const job = await enqueueJob("evo_crm_sync", {}, companyId, undefined, 1);
      enqueued.push(job.id);
    }

    return NextResponse.json({
      message: `Sincronização agendada para ${enqueued.length} empresa(s).`,
      enqueued: enqueued.length,
      skippedRecent,
      jobIds: enqueued,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    console.error("[whatsapp-sync cron] Erro:", detail);
    return NextResponse.json(
      { error: detail, code: "WHATSAPP_SYNC_CRON_ERROR" },
      { status: 500 }
    );
  }
}
