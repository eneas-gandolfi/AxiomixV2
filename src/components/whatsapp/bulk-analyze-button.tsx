/**
 * Arquivo: src/components/whatsapp/bulk-analyze-button.tsx
 * Propósito: Botão para disparar análise em lote de conversas pendentes.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type BulkAnalyzeButtonProps = {
  companyId: string;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // ~2 minutos

type AnalyzeJobStatus = {
  pending: number;
  running: number;
  done: number;
  failed: number;
  total: number;
};

export function BulkAnalyzeButton({ companyId }: BulkAnalyzeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AnalyzeJobStatus | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);
  const lastRefreshedDoneRef = useRef(0);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearPollTimer;
  }, [clearPollTimer]);

  const pollAnalyzeJobs = useCallback(async (jobIds: string[]) => {
    if (jobIds.length === 0) {
      setIsPolling(false);
      return;
    }

    pollAttemptsRef.current += 1;
    if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
      setIsPolling(false);
      setFeedback((prev) => prev ? `${prev} (tempo limite de acompanhamento atingido)` : null);
      return;
    }

    try {
      const params = new URLSearchParams({ companyId, jobIds: jobIds.join(",") });
      const response = await fetch(`/api/whatsapp/bulk-analyze-status?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Falha ao consultar status.");
      }

      const status = (await response.json()) as AnalyzeJobStatus;
      setJobStatus(status);

      // Refresh a cada lote de novas análises concluídas
      if (status.done > lastRefreshedDoneRef.current) {
        lastRefreshedDoneRef.current = status.done;
        router.refresh();
      }

      const remaining = status.pending + status.running;
      if (remaining > 0) {
        setFeedback(
          `Analisando... ${status.done}/${status.total} concluídas` +
          (status.failed > 0 ? `, ${status.failed} falha(s)` : "")
        );
        pollTimerRef.current = setTimeout(() => pollAnalyzeJobs(jobIds), POLL_INTERVAL_MS);
      } else {
        // Tudo finalizado
        setIsPolling(false);
        setFeedback(
          `${status.done} análise(s) concluída(s)` +
          (status.failed > 0 ? `, ${status.failed} falha(s).` : ".")
        );
        router.refresh();
      }
    } catch {
      // Continuar tentando em caso de erro de rede
      pollTimerRef.current = setTimeout(() => pollAnalyzeJobs(jobIds), POLL_INTERVAL_MS);
    }
  }, [companyId, router]);

  const handleBulkAnalyze = async () => {
    setIsLoading(true);
    setIsPolling(false);
    setFeedback(null);
    setError(null);
    setJobStatus(null);
    clearPollTimer();
    pollAttemptsRef.current = 0;
    lastRefreshedDoneRef.current = 0;

    try {
      const response = await fetch("/api/whatsapp/bulk-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        enqueuedAnalyses?: number;
        processedNow?: number;
        scannedConversations?: number;
        jobIds?: string[];
      };

      if (!response.ok) {
        setError(payload.error ?? "Falha ao enfileirar análises.");
        return;
      }

      const enqueued = payload.enqueuedAnalyses ?? 0;
      const processedNow = payload.processedNow ?? 0;
      const jobIds = payload.jobIds ?? [];

      if (enqueued === 0) {
        setFeedback(payload.message ?? "Todas as conversas já possuem análise atualizada.");
        router.refresh();
        return;
      }

      // Refresh imediato para mostrar as análises já processadas
      if (processedNow > 0) {
        router.refresh();
      }

      // Se ainda restam jobs pendentes, iniciar polling
      const remaining = enqueued - processedNow;
      if (remaining > 0 && jobIds.length > 0) {
        setIsPolling(true);
        lastRefreshedDoneRef.current = processedNow;
        setFeedback(`Analisando... ${processedNow}/${enqueued} concluídas`);
        pollTimerRef.current = setTimeout(() => pollAnalyzeJobs(jobIds), POLL_INTERVAL_MS);
      } else {
        setFeedback(payload.message ?? `${processedNow} análise(s) concluída(s).`);
      }
    } catch (requestError) {
      const detail =
        requestError instanceof Error ? requestError.message : "Erro inesperado ao analisar.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const progressPct =
    jobStatus && jobStatus.total > 0
      ? Math.round(((jobStatus.done + jobStatus.failed) / jobStatus.total) * 100)
      : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleBulkAnalyze}
        disabled={isLoading || isPolling}
      >
        <Sparkles className={`h-4 w-4 ${isLoading || isPolling ? "animate-pulse" : ""}`} />
        {isLoading ? "Enfileirando..." : isPolling ? "Analisando..." : "Analisar todas pendentes"}
      </Button>
      {isPolling && progressPct !== null ? (
        <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-[var(--module-accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}
      {feedback ? <p className="text-xs text-success">{feedback}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
