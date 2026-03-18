/**
 * Arquivo: src/lib/jobs/processor.ts
 * Propósito: Processar async_jobs com dispatch por job_type e lock otimista.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import type { AsyncJobRow } from "@/lib/jobs/queue";
import { getNextPendingJob, markJobDone, markJobFailed, markJobRunning, updateJobProgress } from "@/lib/jobs/queue";
// Service modules são importados dinamicamente em dispatchJob() para evitar
// que falha de carregamento de um módulo (ex: pdf-parse) quebre todas as rotas.

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
  conversationId: z.string().uuid("conversationId inválido."),
});

const weeklyReportPayloadSchema = z.object({
  weekStartIso: z.string().datetime().optional(),
  weekEndIso: z.string().datetime().optional(),
});

const ragProcessPayloadSchema = z.object({
  documentId: z.string().uuid("documentId inválido."),
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
    throw new Error("Job sem company_id não pode ser processado.");
  }

  const payload = parseObjectPayload(job.payload);
  switch (job.job_type) {
    case "sofia_crm_sync": {
      const { syncConversations } = await import("@/services/sofia-crm/conversations");
      const syncResult = await syncConversations(job.company_id, (progress) => {
        void updateJobProgress(job.id, {
          phase: progress.phase,
          totalConversations: progress.totalConversations,
          syncedConversations: progress.processedConversations,
          syncedMessages: progress.syncedMessages,
        });
      });
      const { enqueueAutoAnalyses } = await import("@/services/whatsapp/auto-analyze");
      const analyzeResult = await enqueueAutoAnalyses(job.company_id);
      return {
        ...syncResult,
        autoAnalyze: analyzeResult,
      };
    }
    case "competitor_scrape": {
      const { parseCompetitorJobPayload, runCompetitorWorker } = await import("@/services/intelligence/competitor");
      return runCompetitorWorker(job.company_id, parseCompetitorJobPayload(payload));
    }
    case "radar_collect": {
      const { parseRadarJobPayload, runRadarWorkerEnhanced } = await import("@/services/intelligence/radar-enhanced");
      return runRadarWorkerEnhanced(job.company_id, parseRadarJobPayload(payload));
    }
    case "whatsapp_analyze": {
      const parsed = whatsappAnalyzePayloadSchema.parse(payload);
      const { analyzeConversation } = await import("@/services/whatsapp/analyzer");
      return analyzeConversation(job.company_id, parsed.conversationId);
    }
    case "weekly_report": {
      const parsed = weeklyReportPayloadSchema.parse(payload);
      const { runWeeklyReportJob } = await import("@/services/report/weekly-job");
      return runWeeklyReportJob({
        companyId: job.company_id,
        jobId: job.id,
        period: {
          weekStartIso: parsed.weekStartIso,
          weekEndIso: parsed.weekEndIso,
        },
      });
    }
    case "daily_report": {
      const parsed = z.object({
        reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).parse(payload);
      const { runDailyReportJob } = await import("@/services/report/daily-job");
      return runDailyReportJob({
        companyId: job.company_id,
        jobId: job.id,
        reportDate: parsed.reportDate,
      });
    }
    case "rag_process": {
      const parsed = ragProcessPayloadSchema.parse(payload);
      const { runRagProcessWorker } = await import("@/services/rag/processor");
      return runRagProcessWorker(job.company_id, { documentId: parsed.documentId });
    }
    default:
      throw new Error(`job_type não suportado: ${job.job_type}`);
  }
}

async function finalizeJobProcessing(running: AsyncJobRow): Promise<ProcessedJobResult> {
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

export async function processJobById(jobId: string): Promise<ProcessedJobResult | null> {
  const running = await markJobRunning(jobId);
  if (!running) {
    return null;
  }

  return finalizeJobProcessing(running);
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

  return finalizeJobProcessing(running);
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
