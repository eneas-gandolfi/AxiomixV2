/**
 * Arquivo: src/app/api/evo-crm/process/route.ts
 * Propósito: Processar job específico de sincronização do Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { processJobById } from "@/lib/jobs/processor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STALE_RUNNING_MINUTES = 5;

const processSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  jobId: z.string().uuid("jobId inválido."),
});

function isOlderThan(value: string | null, minutes: number) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp < Date.now() - minutes * 60_000;
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = processSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();
    const { data: job, error: jobError } = await adminSupabase
      .from("async_jobs")
      .select("id, status, started_at, completed_at, error_message")
      .eq("id", parsed.data.jobId)
      .eq("company_id", access.companyId)
      .eq("job_type", "evo_crm_sync")
      .maybeSingle();

    if (jobError) {
      throw new Error(`Falha ao carregar job do Evo CRM: ${jobError.message}`);
    }

    if (!job?.id) {
      return NextResponse.json(
        { error: "Job de sincronização não encontrado.", code: "EVO_SYNC_JOB_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (job.status === "done" || job.status === "failed") {
      return NextResponse.json({
        companyId: access.companyId,
        jobId: job.id,
        jobStatus: job.status,
        error: job.error_message,
        completedAt: job.completed_at,
      });
    }

    if (job.status === "running" && isOlderThan(job.started_at, STALE_RUNNING_MINUTES)) {
      const { error: resetError } = await adminSupabase
        .from("async_jobs")
        .update({
          status: "pending",
          started_at: null,
          completed_at: null,
          error_message: "Job running stale resetado para reprocessamento.",
        })
        .eq("id", job.id)
        .eq("status", "running");

      if (resetError) {
        throw new Error(`Falha ao resetar job stale do Evo CRM: ${resetError.message}`);
      }
    } else if (job.status === "running") {
      return NextResponse.json({
        companyId: access.companyId,
        jobId: job.id,
        jobStatus: "running",
        message: "Job já está em processamento.",
      });
    }

    const processed = await processJobById(job.id);

    return NextResponse.json({
      companyId: access.companyId,
      jobId: job.id,
      jobStatus: processed?.status ?? "running",
      completedAt: processed?.status === "done" ? new Date().toISOString() : null,
      error: processed?.error ?? null,
      result: processed?.result ?? null,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVO_SYNC_PROCESS_ERROR" }, { status: 500 });
  }
}
