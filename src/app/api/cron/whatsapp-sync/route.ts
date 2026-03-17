/**
 * Arquivo: src/app/api/cron/whatsapp-sync/route.ts
 * Proposito: Cron job para sincronizar conversas do Sofia CRM em background.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

const MIN_SYNC_INTERVAL_MINUTES = 15;

function isCronCall(request: NextRequest) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    return cronSecretHeader === cronSecret;
  }

  return Boolean(vercelCronHeader);
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronCall(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const recentSyncCutoff = new Date(Date.now() - MIN_SYNC_INTERVAL_MINUTES * 60_000).toISOString();

    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id")
      .eq("status", "active");

    if (companiesError) {
      throw new Error(`Falha ao buscar empresas: ${companiesError.message}`);
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        message: "Nenhuma empresa ativa para sincronizar.",
        enqueued: 0,
        skippedRecent: 0,
      });
    }

    const enqueued: string[] = [];
    let skippedRecent = 0;

    for (const company of companies) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("is_active, test_status")
        .eq("company_id", company.id)
        .eq("type", "sofia_crm")
        .maybeSingle();

      if (!integration?.is_active || integration.test_status !== "ok") {
        continue;
      }

      const { data: existingJobs } = await supabase
        .from("async_jobs")
        .select("id")
        .eq("company_id", company.id)
        .eq("job_type", "sofia_crm_sync")
        .in("status", ["pending", "running"])
        .limit(1);

      if (existingJobs && existingJobs.length > 0) {
        continue;
      }

      const { data: recentCompletedJobs } = await supabase
        .from("async_jobs")
        .select("id")
        .eq("company_id", company.id)
        .eq("job_type", "sofia_crm_sync")
        .eq("status", "done")
        .gte("created_at", recentSyncCutoff)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentCompletedJobs && recentCompletedJobs.length > 0) {
        skippedRecent += 1;
        continue;
      }

      const job = await enqueueJob("sofia_crm_sync", {}, company.id, undefined, 1);
      enqueued.push(job.id);
    }

    return NextResponse.json({
      message: `Sincronizacao agendada para ${enqueued.length} empresa(s).`,
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
