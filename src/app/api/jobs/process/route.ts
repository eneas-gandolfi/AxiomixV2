/**
 * Arquivo: src/app/api/jobs/process/route.ts
 * Propósito: Processar jobs pendentes da fila async_jobs (cron global ou execucao autenticada).
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { processJobs } from "@/lib/jobs/processor";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const allowedJobTypes = [
  "evo_crm_sync",
  "whatsapp_analyze",
  "weekly_report",
  "competitor_scrape",
  "radar_collect",
  "group_agent_respond",
  "group_rag_batch",
] as const;

const processSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  maxJobs: z.number().int().min(1).max(10).optional(),
  allowedTypes: z.array(z.enum(allowedJobTypes)).min(1).max(allowedJobTypes.length).optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Metodo GET reservado para cron.", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    const summary = await processJobs({ maxJobs: 1 });
    return NextResponse.json({
      mode: "cron",
      processed: summary.processed,
      jobs: summary.jobs,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "JOBS_PROCESS_GET_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = processSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (isCronAuthorized(request)) {
      const summary = await processJobs({
        maxJobs: parsed.data.maxJobs ?? 1,
        allowedTypes: parsed.data.allowedTypes,
      });

      return NextResponse.json({
        mode: "cron",
        processed: summary.processed,
        jobs: summary.jobs,
      });
    }

    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const summary = await processJobs({
      companyId: access.companyId,
      maxJobs: parsed.data.maxJobs ?? 1,
      allowedTypes: parsed.data.allowedTypes,
    });

    return NextResponse.json({
      mode: "authenticated",
      companyId: access.companyId,
      processed: summary.processed,
      jobs: summary.jobs,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "JOBS_PROCESS_ERROR" }, { status: 500 });
  }
}
