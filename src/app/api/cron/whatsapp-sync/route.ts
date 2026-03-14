/**
 * Arquivo: src/app/api/cron/whatsapp-sync/route.ts
 * Proposito: Cron job para sincronizar conversas do Sofia CRM a cada 15 minutos.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

function isCronCall(request: NextRequest) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(vercelCronHeader) || (Boolean(cronSecret) && cronSecretHeader === cronSecret);
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

    // Buscar todas as empresas ativas com integração Sofia CRM configurada
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
      });
    }

    const enqueued: string[] = [];

    for (const company of companies) {
      // Verificar se a integração Sofia CRM está ativa
      const { data: integration } = await supabase
        .from("integrations")
        .select("is_active, test_status")
        .eq("company_id", company.id)
        .eq("type", "sofia_crm")
        .maybeSingle();

      if (!integration?.is_active || integration.test_status !== "ok") {
        continue;
      }

      // Verificar se já não há um job pendente/running para esta empresa
      const { data: existingJobs } = await supabase
        .from("async_jobs")
        .select("id")
        .eq("company_id", company.id)
        .eq("job_type", "sofia_crm_sync")
        .in("status", ["pending", "running"])
        .limit(1);

      if (existingJobs && existingJobs.length > 0) {
        continue; // Já tem um job em andamento, não criar duplicado
      }

      // Enfileirar job de sincronização
      const job = await enqueueJob("sofia_crm_sync", {}, company.id);
      enqueued.push(job.id);
    }

    return NextResponse.json({
      message: `Sincronização agendada para ${enqueued.length} empresa(s).`,
      enqueued: enqueued.length,
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
