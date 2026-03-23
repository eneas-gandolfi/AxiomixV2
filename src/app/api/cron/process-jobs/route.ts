/**
 * Arquivo: src/app/api/cron/process-jobs/route.ts
 * Propósito: Endpoint dedicado para processar jobs pendentes da fila async_jobs.
 * Autor: AXIOMIX
 * Data: 2026-03-23
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { processJobs } from "@/lib/jobs/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const result = await processJobs({ maxJobs: 2 });

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      jobs: result.jobs.map((j) => ({
        jobId: j.jobId,
        jobType: j.jobType,
        status: j.status,
        error: j.error,
      })),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    console.error("[process-jobs cron] Erro:", detail);
    return NextResponse.json(
      { error: detail, code: "PROCESS_JOBS_CRON_ERROR" },
      { status: 500 }
    );
  }
}
