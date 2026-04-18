"use client";

import { useEffect, useState } from "react";

type SyncRequest = {
  companyId: string;
  conversationId?: string;
  mode?: "full" | "messages_only";
  processAnalyses?: boolean;
  maxAnalyses?: number;
};

type SyncResult = {
  syncedConversations?: number;
  syncedMessages?: number;
  totalConversations?: number;
  phase?: string;
  conversationId?: string;
  externalId?: string;
};

type SyncAnalysis = {
  scannedConversations?: number;
  enqueuedAnalyses?: number;
  processedAnalyses?: number;
  failedAnalyses?: number;
};

export type EvoSyncResponse = {
  companyId: string;
  mode?: "messages" | "conversations" | "messages_only";
  jobId?: string;
  jobStatus?: "idle" | "pending" | "running" | "done" | "failed";
  message?: string;
  error?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  result?: SyncResult;
  analysis?: SyncAnalysis;
};

type SyncProgress = {
  totalConversations: number;
  processedConversations: number;
  syncedMessages: number;
  phase: string;
};

export type EvoSyncMode = "full" | "messages_only" | "messages" | null;

type EvoSyncStatus = {
  syncing: boolean;
  activeMode: EvoSyncMode;
  lastSyncAt: string | null;
  errorMessage: string | null;
  lastResult: EvoSyncResponse | null;
  progress: SyncProgress | null;
};

const DEFAULT_STATUS: EvoSyncStatus = {
  syncing: false,
  activeMode: null,
  lastSyncAt: null,
  errorMessage: null,
  lastResult: null,
  progress: null,
};

const statusByCompany = new Map<string, EvoSyncStatus>();
const listenersByCompany = new Map<string, Set<() => void>>();
const inFlightByCompany = new Map<string, Promise<EvoSyncResponse>>();
const JOB_POLL_INTERVAL_MS = 2000;
const JOB_POLL_MAX_ATTEMPTS = 180;

function ensureStatus(companyId: string) {
  if (!statusByCompany.has(companyId)) {
    statusByCompany.set(companyId, DEFAULT_STATUS);
  }

  return statusByCompany.get(companyId) ?? DEFAULT_STATUS;
}

function notify(companyId: string) {
  const listeners = listenersByCompany.get(companyId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener();
  }
}

function updateStatus(companyId: string, patch: Partial<EvoSyncStatus>) {
  const current = ensureStatus(companyId);
  statusByCompany.set(companyId, {
    ...current,
    ...patch,
  });
  notify(companyId);
}

function subscribe(companyId: string, listener: () => void) {
  const listeners = listenersByCompany.get(companyId) ?? new Set<() => void>();
  listeners.add(listener);
  listenersByCompany.set(companyId, listeners);

  return () => {
    const current = listenersByCompany.get(companyId);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      listenersByCompany.delete(companyId);
    }
  };
}

async function parseSyncResponse(response: Response) {
  const rawText = await response.text();
  if (!rawText) {
    return {
      payload: {} as EvoSyncResponse & { error?: string },
      rawText,
    };
  }

  try {
    return {
      payload: JSON.parse(rawText) as EvoSyncResponse & { error?: string },
      rawText,
    };
  } catch {
    return {
      payload: {} as EvoSyncResponse & { error?: string },
      rawText,
    };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSyncJobStatus(companyId: string, jobId: string): Promise<EvoSyncResponse> {
  const params = new URLSearchParams({
    companyId,
    jobId,
  });
  const response = await fetch(`/api/evo-crm/sync-status?${params.toString()}`, {
    method: "GET",
  });
  const { payload, rawText } = await parseSyncResponse(response);

  if (!response.ok) {
    throw new Error(payload.error ?? (rawText.slice(0, 180) || "Falha ao consultar status da sincronização."));
  }

  return payload;
}

async function waitForSyncCompletion(companyId: string, jobId: string): Promise<EvoSyncResponse> {
  for (let attempt = 0; attempt < JOB_POLL_MAX_ATTEMPTS; attempt += 1) {
    const payload = await fetchSyncJobStatus(companyId, jobId);

    if (payload.jobStatus === "done") {
      updateStatus(companyId, { progress: null });
      return payload;
    }

    if (payload.jobStatus === "failed") {
      updateStatus(companyId, { progress: null });
      throw new Error(payload.error ?? "Falha ao sincronizar conversas.");
    }

    const total = payload.result?.totalConversations;
    const processed = payload.result?.syncedConversations;
    const phase = payload.result?.phase;
    if (typeof total === "number" && total > 0) {
      updateStatus(companyId, {
        progress: {
          totalConversations: total,
          processedConversations: processed ?? 0,
          syncedMessages: payload.result?.syncedMessages ?? 0,
          phase: phase ?? "conversations",
        },
      });
    }

    await sleep(JOB_POLL_INTERVAL_MS);
  }

  updateStatus(companyId, { progress: null });
  throw new Error("A sincronização demorou mais do que o esperado. Verifique novamente em instantes.");
}

export async function requestEvoSync(input: SyncRequest): Promise<EvoSyncResponse> {
  const existing = inFlightByCompany.get(input.companyId);
  if (existing) {
    return existing;
  }

  const requestedMode: EvoSyncMode = input.conversationId
    ? "messages"
    : input.mode === "messages_only"
      ? "messages_only"
      : "full";

  updateStatus(input.companyId, {
    syncing: true,
    activeMode: requestedMode,
    errorMessage: null,
    progress: null,
  });

  const requestPromise = (async () => {
    try {
      const response = await fetch("/api/evo-crm/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const { payload, rawText } = await parseSyncResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? (rawText.slice(0, 180) || "Falha ao sincronizar conversas."));
      }

      if (payload.mode === "conversations" && payload.jobId && payload.jobStatus !== "done") {
        updateStatus(input.companyId, {
          syncing: true,
          activeMode: "full",
          errorMessage: null,
          lastResult: payload,
        });

        const completedPayload = await waitForSyncCompletion(input.companyId, payload.jobId);
        updateStatus(input.companyId, {
          syncing: false,
          activeMode: null,
          errorMessage: null,
          lastSyncAt: completedPayload.completedAt ?? new Date().toISOString(),
          lastResult: completedPayload,
          progress: null,
        });

        return completedPayload;
      }

      const completedAt = new Date().toISOString();
      updateStatus(input.companyId, {
        syncing: false,
        activeMode: null,
        errorMessage: null,
        lastSyncAt: payload.completedAt ?? completedAt,
        lastResult: payload,
        progress: null,
      });

      return payload;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado ao sincronizar.";
      updateStatus(input.companyId, {
        syncing: false,
        activeMode: null,
        errorMessage: detail,
        progress: null,
      });
      throw new Error(detail);
    } finally {
      inFlightByCompany.delete(input.companyId);
    }
  })();

  inFlightByCompany.set(input.companyId, requestPromise);
  return requestPromise;
}

export function useEvoSyncStatus(companyId: string) {
  const [status, setStatus] = useState<EvoSyncStatus>(() => ensureStatus(companyId));

  useEffect(() => {
    setStatus(ensureStatus(companyId));
    return subscribe(companyId, () => {
      setStatus(ensureStatus(companyId));
    });
  }, [companyId]);

  return status;
}
