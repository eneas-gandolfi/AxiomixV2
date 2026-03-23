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
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const result = await processJobs({ maxJobs: 2 });
      console.log("[process-jobs cron] Processados:", result.processed, "jobs");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[process-jobs cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Processamento iniciado em background." });
}
