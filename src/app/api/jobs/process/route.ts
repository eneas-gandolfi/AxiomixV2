/**
 * Arquivo: src/app/api/jobs/process/route.ts
 * Proposito: Processar jobs pendentes da fila async_jobs (cron global ou execucao autenticada).
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { processJobs } from "@/lib/jobs/processor";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const processSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
  maxJobs: z.number().int().min(1).max(10).optional(),
});

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
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (isCronCall(request)) {
      const summary = await processJobs({
        maxJobs: parsed.data.maxJobs ?? 1,
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
