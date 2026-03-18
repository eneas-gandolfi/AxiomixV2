/**
 * Arquivo: src/app/api/sofia-crm/sync/route.ts
 * Propósito: Disparar sincronização manual de conversas/mensagens do Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { processJobById } from "@/lib/jobs/processor";
import { syncMessages, syncRecentMessages } from "@/services/sofia-crm/conversations";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STALE_PENDING_MINUTES = 2;
const STALE_RUNNING_MINUTES = 5;

const syncRequestSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  conversationId: z.string().uuid("conversationId inválido.").optional(),
  mode: z.enum(["full", "messages_only"]).optional(),
  processAnalyses: z.boolean().optional().default(true),
  maxAnalyses: z.number().int().min(1).max(10).optional(),
});

async function clearStaleSofiaSyncJobs(companyId: string) {
  const adminSupabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const stalePendingCutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60_000).toISOString();
  const staleRunningCutoff = new Date(Date.now() - STALE_RUNNING_MINUTES * 60_000).toISOString();

  await adminSupabase
    .from("async_jobs")
    .update({
      status: "failed",
      error_message: "Job expirou em pending e foi encerrado automaticamente.",
      completed_at: nowIso,
    })
    .eq("company_id", companyId)
    .eq("job_type", "sofia_crm_sync")
    .eq("status", "pending")
    .lt("created_at", stalePendingCutoff);

  await adminSupabase
    .from("async_jobs")
    .update({
      status: "failed",
      error_message: "Job expirou em running e foi encerrado automaticamente.",
      completed_at: nowIso,
    })
    .eq("company_id", companyId)
    .eq("job_type", "sofia_crm_sync")
    .eq("status", "running")
    .lt("started_at", staleRunningCutoff);
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = syncRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (parsed.data.conversationId) {
      const messageResult = await syncMessages(access.companyId, parsed.data.conversationId);
      return NextResponse.json({
        companyId: access.companyId,
        mode: "messages",
        result: messageResult,
      });
    }

    if (parsed.data.mode === "messages_only") {
      const result = await syncRecentMessages(access.companyId, {
        conversationLimit: 5,
        messageLimit: 80,
      });
      return NextResponse.json({
        companyId: access.companyId,
        mode: "messages_only",
        result,
      });
    }

    await clearStaleSofiaSyncJobs(access.companyId);

    const adminSupabase = createSupabaseAdminClient();
    const { data: existingJob } = await adminSupabase
      .from("async_jobs")
      .select("id, status")
      .eq("company_id", access.companyId)
      .eq("job_type", "sofia_crm_sync")
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob?.id) {
      return NextResponse.json({
        companyId: access.companyId,
        mode: "conversations",
        jobId: existingJob.id,
        jobStatus: existingJob.status,
        message: "Sincronização já está em andamento.",
      });
    }

    const queuedJob = await enqueueJob("sofia_crm_sync", {}, access.companyId, undefined, 1);

    const processed = await processJobById(queuedJob.id);

    return NextResponse.json({
      companyId: access.companyId,
      mode: "conversations",
      jobId: queuedJob.id,
      jobStatus: processed?.status === "done" ? "done" : processed?.status === "failed" ? "failed" : "pending",
      completedAt: processed?.status === "done" ? new Date().toISOString() : null,
      error: processed?.error ?? null,
      result: processed?.result ?? null,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "SOFIA_SYNC_ERROR" }, { status: 500 });
  }
}
