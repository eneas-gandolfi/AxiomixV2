/**
 * Arquivo: src/app/api/evo-crm/sync-status/route.ts
 * Propósito: Consultar status do job de sincronização do Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STALE_PENDING_MINUTES = 3;
const STALE_RUNNING_MINUTES = 10;

const querySchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  jobId: z.string().uuid("jobId inválido.").optional(),
});

function mapJobResult(raw: unknown) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      result: undefined,
      analysis: undefined,
    };
  }

  const payload = raw as Record<string, unknown>;
  const rawAutoAnalyze =
    typeof payload.autoAnalyze === "object" && payload.autoAnalyze !== null && !Array.isArray(payload.autoAnalyze)
      ? (payload.autoAnalyze as Record<string, unknown>)
      : null;

  return {
    result: {
      syncedConversations:
        typeof payload.syncedConversations === "number" ? payload.syncedConversations : undefined,
      syncedMessages:
        typeof payload.syncedMessages === "number" ? payload.syncedMessages : undefined,
      totalConversations:
        typeof payload.totalConversations === "number" ? payload.totalConversations : undefined,
      phase:
        typeof payload.phase === "string" ? payload.phase : undefined,
    },
    analysis: rawAutoAnalyze
      ? {
          scannedConversations:
            typeof rawAutoAnalyze.scannedConversations === "number"
              ? rawAutoAnalyze.scannedConversations
              : undefined,
          enqueuedAnalyses:
            typeof rawAutoAnalyze.enqueuedAnalyses === "number"
              ? rawAutoAnalyze.enqueuedAnalyses
              : undefined,
          processedAnalyses:
            typeof rawAutoAnalyze.processedAnalyses === "number"
              ? rawAutoAnalyze.processedAnalyses
              : undefined,
          failedAnalyses:
            typeof rawAutoAnalyze.failedAnalyses === "number"
              ? rawAutoAnalyze.failedAnalyses
              : undefined,
        }
      : undefined,
  };
}

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

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const parsed = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
      jobId: request.nextUrl.searchParams.get("jobId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Query inválida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const adminSupabase = createSupabaseAdminClient();
    let query = adminSupabase
      .from("async_jobs")
      .select("id, status, error_message, result, started_at, completed_at, created_at")
      .eq("company_id", access.companyId)
      .eq("job_type", "evo_crm_sync")
      .order("created_at", { ascending: false })
      .limit(1);

    if (parsed.data.jobId) {
      query = query.eq("id", parsed.data.jobId);
    }

    const { data: job, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Falha ao consultar status do sync: ${error.message}`);
    }

    if (!job?.id) {
      return NextResponse.json({
        companyId: access.companyId,
        jobStatus: "idle",
      });
    }

    if (
      (job.status === "pending" && isOlderThan(job.created_at, STALE_PENDING_MINUTES)) ||
      (job.status === "running" && isOlderThan(job.started_at, STALE_RUNNING_MINUTES))
    ) {
      const staleMessage =
        job.status === "running"
          ? "Job de sincronização travou em running e foi encerrado automaticamente."
          : "Job de sincronização ficou pendente por tempo demais e foi encerrado automaticamente.";

      const { error: staleError } = await adminSupabase
        .from("async_jobs")
        .update({
          status: "failed",
          error_message: staleMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", job.status);

      if (!staleError) {
        return NextResponse.json({
          companyId: access.companyId,
          jobId: job.id,
          jobStatus: "failed",
          error: staleMessage,
          startedAt: job.started_at,
          completedAt: new Date().toISOString(),
          createdAt: job.created_at,
        });
      }
    }

    const mapped = mapJobResult(job.result);

    return NextResponse.json({
      companyId: access.companyId,
      jobId: job.id,
      jobStatus: job.status,
      error: job.error_message,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdAt: job.created_at,
      result: mapped.result,
      analysis: mapped.analysis,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVO_SYNC_STATUS_ERROR" }, { status: 500 });
  }
}
