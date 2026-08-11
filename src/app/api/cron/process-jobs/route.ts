/**
 * Arquivo: src/app/api/cron/process-jobs/route.ts
 * Propósito: Endpoint dedicado para processar jobs pendentes da fila async_jobs.
 *            Responde imediatamente e processa em background via after().
 * Autor: AXIOMIX
 * Data: 2026-03-23
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { processJobs } from "@/lib/jobs/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function resolveProcessJobsMaxJobs(headers: Headers): number {
  const requested = Number(headers.get("x-cron-max-jobs") ?? "1");
  if (!Number.isFinite(requested)) return 1;
  return Math.min(Math.max(Math.floor(requested), 1), 5);
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const maxJobs = resolveProcessJobsMaxJobs(request.headers);
      const result = await processJobs({ maxJobs });
      console.log("[process-jobs cron] Processados:", result.processed, "jobs");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[process-jobs cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Processamento iniciado em background." });
}
