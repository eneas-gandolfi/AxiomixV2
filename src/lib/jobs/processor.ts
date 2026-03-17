/**
 * Arquivo: src/lib/jobs/processor.ts
 * Proposito: Processar async_jobs com dispatch por job_type e lock otimista.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import type { AsyncJobRow } from "@/lib/jobs/queue";
import { getNextPendingJob, markJobDone, markJobFailed, markJobRunning } from "@/lib/jobs/queue";
import { parseCompetitorJobPayload, runCompetitorWorker } from "@/services/intelligence/competitor";
import { parseRadarJobPayload, runRadarWorkerEnhanced } from "@/services/intelligence/radar-enhanced";
import { runWeeklyReportJob } from "@/services/report/weekly-job";
import { syncConversations } from "@/services/sofia-crm/conversations";
import { analyzeConversation } from "@/services/whatsapp/analyzer";
import { enqueueAutoAnalyses } from "@/services/whatsapp/auto-analyze";

type ProcessedJobResult = {
  jobId: string;
  companyId: string | null;
  jobType: AsyncJobRow["job_type"];
  status: "done" | "failed";
  result?: unknown;
  error?: string;
};

export type JobsProcessingSummary = {
  processed: number;
  jobs: ProcessedJobResult[];
};

type ProcessJobsOptions = {
  companyId?: string;
  maxJobs?: number;
  allowedTypes?: AsyncJobRow["job_type"][];
};

const whatsappAnalyzePayloadSchema = z.object({
  conversationId: z.string().uuid("conversationId invalido."),
});

const weeklyReportPayloadSchema = z.object({
  weekStartIso: z.string().datetime().optional(),
  weekEndIso: z.string().datetime().optional(),
});

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Erro inesperado no worker.";
}

function parseObjectPayload(payload: AsyncJobRow["payload"]) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return {};
  }
  return payload;
}

async function dispatchJob(job: AsyncJobRow): Promise<unknown> {
  if (!job.company_id) {
    throw new Error("Job sem company_id nao pode ser processado.");
  }

  const payload = parseObjectPayload(job.payload);
  switch (job.job_type) {
    case "sofia_crm_sync": {
      const syncResult = await syncConversations(job.company_id);
      // Após sync bem-sucedido, enfileirar análises automáticas para conversas sem insight
      const analyzeResult = await enqueueAutoAnalyses(job.company_id);
      return {
        ...syncResult,
        autoAnalyze: analyzeResult,
      };
    }
    case "competitor_scrape":
      return runCompetitorWorker(job.company_id, parseCompetitorJobPayload(payload));
    case "radar_collect":
      return runRadarWorkerEnhanced(job.company_id, parseRadarJobPayload(payload));
    case "whatsapp_analyze": {
      const parsed = whatsappAnalyzePayloadSchema.parse(payload);
      return analyzeConversation(job.company_id, parsed.conversationId);
    }
    case "weekly_report": {
      const parsed = weeklyReportPayloadSchema.parse(payload);
      return runWeeklyReportJob({
        companyId: job.company_id,
        jobId: job.id,
        period: {
          weekStartIso: parsed.weekStartIso,
          weekEndIso: parsed.weekEndIso,
        },
      });
    }
    default:
      throw new Error(`job_type nao suportado: ${job.job_type}`);
  }
}

export async function processNextJob(
  companyId?: string,
  allowedTypes?: AsyncJobRow["job_type"][]
): Promise<ProcessedJobResult | null> {
  const pending = await getNextPendingJob(companyId, allowedTypes);
  if (!pending) {
    return null;
  }

  const running = await markJobRunning(pending.id);
  if (!running) {
    return null;
  }

  try {
    const result = await dispatchJob(running);
    await markJobDone(running.id, result);
    return {
      jobId: running.id,
      companyId: running.company_id,
      jobType: running.job_type,
      status: "done",
      result,
    };
  } catch (error) {
    const detail = normalizeError(error);
    await markJobFailed(running.id, detail);
    return {
      jobId: running.id,
      companyId: running.company_id,
      jobType: running.job_type,
      status: "failed",
      error: detail,
    };
  }
}

export async function processJobs(options?: ProcessJobsOptions): Promise<JobsProcessingSummary> {
  const companyId = options?.companyId;
  const maxJobs = Math.min(Math.max(options?.maxJobs ?? 1, 1), 10);
  const allowedTypes = options?.allowedTypes;
  const jobs: ProcessedJobResult[] = [];

  for (let index = 0; index < maxJobs; index += 1) {
    const processed = await processNextJob(companyId, allowedTypes);
    if (!processed) {
      break;
    }
    jobs.push(processed);
  }

  return {
    processed: jobs.length,
    jobs,
  };
}
