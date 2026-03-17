/**
 * Arquivo: src/lib/jobs/queue.ts
 * Proposito: Operacoes de fila para async_jobs com lock otimista e retry.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { Database, Json } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type JobType = Database["public"]["Tables"]["async_jobs"]["Row"]["job_type"];
export type AsyncJobRow = Database["public"]["Tables"]["async_jobs"]["Row"];

const JOB_SELECT_FIELDS =
  "id, company_id, job_type, payload, status, attempts, max_attempts, error_message, result, scheduled_for, started_at, completed_at, created_at";

type EnqueueJobResult = {
  id: string;
  companyId: string;
  jobType: JobType;
  scheduledFor: string | null;
  status: AsyncJobRow["status"];
};

function nowIso() {
  return new Date().toISOString();
}

function toJsonValue(value: unknown): Json {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as Json;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).map(([key, item]) => [key, toJsonValue(item)] as const);
    return Object.fromEntries(entries) as Json;
  }

  return String(value);
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Erro inesperado no processamento do job.";
}

function retryDelayMinutes(attempts: number) {
  const candidate = Math.max(2, 2 ** attempts);
  return Math.min(candidate, 30);
}

export async function enqueueJob(
  type: JobType,
  payload: unknown,
  companyId: string,
  scheduledFor?: string,
  maxAttempts?: number
): Promise<EnqueueJobResult> {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("async_jobs")
    .insert({
      company_id: companyId,
      job_type: type,
      payload: toJsonValue(payload),
      status: "pending",
      scheduled_for: scheduledFor ?? nowIso(),
      ...(maxAttempts !== undefined ? { max_attempts: maxAttempts } : {}),
    })
    .select("id, company_id, job_type, scheduled_for, status")
    .single();

  if (error || !row?.id || !row.company_id || !row.job_type) {
    throw new Error("Falha ao enfileirar job async.");
  }

  return {
    id: row.id,
    companyId: row.company_id,
    jobType: row.job_type,
    scheduledFor: row.scheduled_for,
    status: row.status,
  };
}

export async function getNextPendingJob(
  companyId?: string,
  allowedTypes?: JobType[]
): Promise<AsyncJobRow | null> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("async_jobs")
    .select(JOB_SELECT_FIELDS)
    .eq("status", "pending")
    .lte("scheduled_for", nowIso())
    .order("scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (allowedTypes && allowedTypes.length > 0) {
    query = query.in("job_type", allowedTypes);
  }

  const { data: row, error } = companyId
    ? await query.eq("company_id", companyId).maybeSingle()
    : await query.maybeSingle();

  if (error) {
    throw new Error("Falha ao buscar proximo job pendente.");
  }

  return row ?? null;
}

export async function markJobRunning(jobId: string): Promise<AsyncJobRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data: pendingRow, error: pendingError } = await supabase
    .from("async_jobs")
    .select(JOB_SELECT_FIELDS)
    .eq("id", jobId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) {
    throw new Error("Falha ao validar job pendente para lock.");
  }
  if (!pendingRow?.id) {
    return null;
  }

  const nextAttempts = (pendingRow.attempts ?? 0) + 1;
  const { data: updated, error: updateError } = await supabase
    .from("async_jobs")
    .update({
      status: "running",
      attempts: nextAttempts,
      started_at: nowIso(),
      error_message: null,
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select(JOB_SELECT_FIELDS)
    .maybeSingle();

  if (updateError) {
    throw new Error("Falha ao marcar job como running.");
  }

  return updated ?? null;
}

export async function markJobDone(jobId: string, result: unknown): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("async_jobs")
    .update({
      status: "done",
      result: toJsonValue(result),
      completed_at: nowIso(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("Falha ao marcar job como done.");
  }
}

export async function markJobFailed(jobId: string, error: unknown): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("async_jobs")
    .select(JOB_SELECT_FIELDS)
    .eq("id", jobId)
    .maybeSingle();

  if (fetchError || !row?.id) {
    throw new Error("Falha ao carregar job para marcar erro.");
  }

  const attempts = row.attempts ?? 0;
  const maxAttempts = row.max_attempts ?? 3;
  const errorMessage = normalizeErrorMessage(error);
  const shouldRetry = attempts < maxAttempts;

  if (shouldRetry) {
    const nextScheduled = new Date(Date.now() + retryDelayMinutes(attempts) * 60_000).toISOString();
    const { error: updateError } = await supabase
      .from("async_jobs")
      .update({
        status: "pending",
        error_message: errorMessage,
        scheduled_for: nextScheduled,
      })
      .eq("id", jobId);

    if (updateError) {
      throw new Error("Falha ao reagendar job com retry.");
    }
    return;
  }

  const { error: failError } = await supabase
    .from("async_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: nowIso(),
    })
    .eq("id", jobId);

  if (failError) {
    throw new Error("Falha ao marcar job como failed.");
  }
}
