/**
 * Arquivo: src/app/api/cron/whatsapp-analyze/route.ts
 * Proposito: Cron job dedicado para processar analises pendentes do WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { NextRequest, NextResponse } from "next/server";
import {
  markJobDone,
  markJobFailed,
  markJobRunning,
  type AsyncJobRow,
} from "@/lib/jobs/queue";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { analyzeConversation } from "@/services/whatsapp/analyzer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CRON_MAX_ANALYSES = 3;
const JOB_SELECT_FIELDS =
  "id, company_id, job_type, payload, status, attempts, max_attempts, error_message, result, scheduled_for, started_at, completed_at, created_at";

function isCronCall(request: NextRequest) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return cronSecretHeader === cronSecret;
  }
  return Boolean(vercelCronHeader);
}

function parseConversationId(payload: AsyncJobRow["payload"]) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Payload do job de analise invalido.");
  }

  const rawConversationId = payload.conversationId;
  if (typeof rawConversationId !== "string" || rawConversationId.trim().length === 0) {
    throw new Error("conversationId ausente no job de analise.");
  }

  return rawConversationId;
}

async function getPendingAnalyzeJobs(limit: number): Promise<AsyncJobRow[]> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("async_jobs")
    .select(JOB_SELECT_FIELDS)
    .eq("status", "pending")
    .eq("job_type", "whatsapp_analyze")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("Falha ao carregar jobs pendentes de analise.");
  }

  return data ?? [];
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronCall(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const pendingJobs = await getPendingAnalyzeJobs(CRON_MAX_ANALYSES);
    const jobs: Array<{
      jobId: string;
      companyId: string | null;
      jobType: AsyncJobRow["job_type"];
      status: "done" | "failed";
      error?: string;
      result?: unknown;
    }> = [];

    for (const pendingJob of pendingJobs) {
      const runningJob = await markJobRunning(pendingJob.id);
      if (!runningJob) {
        continue;
      }

      try {
        if (!runningJob.company_id) {
          throw new Error("Job sem company_id nao pode ser processado.");
        }

        const conversationId = parseConversationId(runningJob.payload);
        const result = await analyzeConversation(runningJob.company_id, conversationId);
        await markJobDone(runningJob.id, result);

        jobs.push({
          jobId: runningJob.id,
          companyId: runningJob.company_id,
          jobType: runningJob.job_type,
          status: "done",
          result,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Erro inesperado no worker.";
        await markJobFailed(runningJob.id, detail);

        jobs.push({
          jobId: runningJob.id,
          companyId: runningJob.company_id,
          jobType: runningJob.job_type,
          status: "failed",
          error: detail,
        });
      }
    }

    return NextResponse.json({
      mode: "cron",
      processed: jobs.length,
      jobs,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "WHATSAPP_ANALYZE_CRON_ERROR" },
      { status: 500 }
    );
  }
}
