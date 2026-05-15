/**
 * Arquivo: src/components/whatsapp/sync-evo-crm-button.tsx
 * Propósito: Botão "Sincronizar agora" — dispara /api/evo-crm/sync e faz
 *            poll do /api/evo-crm/sync-status; ao final, refresh da página
 *            para o Server Component reler o banco com as conversas novas.
 *
 *            Caminho principal de sync continua sendo webhook real-time
 *            do Evo CRM. Este botão é um manual override para casos onde
 *            há conversas que nunca dispararam webhook (ex: pending velhas
 *            no Evo CRM, primeira sincronização após mudança de filtros).
 * Autor: AXIOMIX
 * Data: 2026-05-15
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 90; // ~3 minutos

type JobStatus = "idle" | "pending" | "running" | "done" | "failed";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function SyncEvoCrmButton() {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const abortedRef = useRef(false);

  useEffect(() => () => {
    abortedRef.current = true;
  }, []);

  const handleClick = useCallback(async () => {
    setStatus("pending");
    setFeedback(null);

    try {
      const response = await fetch("/api/evo-crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await response.json()) as {
        jobId?: string;
        jobStatus?: JobStatus;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.jobId) {
        setStatus("failed");
        setFeedback(data.error ?? data.message ?? "Falha ao iniciar sync.");
        return;
      }

      const jobId = data.jobId;
      setStatus(data.jobStatus === "running" ? "running" : "pending");
      if (data.message) {
        setFeedback(data.message);
      }

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
        await sleep(POLL_INTERVAL_MS);
        if (abortedRef.current) return;

        const statusResponse = await fetch(
          `/api/evo-crm/sync-status?jobId=${encodeURIComponent(jobId)}`,
          { cache: "no-store" },
        );
        const statusData = (await statusResponse.json()) as {
          jobStatus?: JobStatus;
          error?: string | null;
          result?: { syncedConversations?: number; syncedMessages?: number };
        };

        if (statusData.jobStatus === "done") {
          setStatus("done");
          const conv = statusData.result?.syncedConversations ?? 0;
          const msg = statusData.result?.syncedMessages ?? 0;
          setFeedback(
            `Sincronização concluída · ${conv} conversa(s), ${msg} mensagem(ns).`,
          );
          router.refresh();
          return;
        }

        if (statusData.jobStatus === "failed") {
          setStatus("failed");
          setFeedback(statusData.error ?? "Falha ao sincronizar.");
          return;
        }
      }

      setStatus("idle");
      setFeedback("Sincronização demorou demais — tente novamente.");
    } catch (error) {
      setStatus("failed");
      setFeedback(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }, [router]);

  const isBusy = status === "pending" || status === "running";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isBusy}
        title="Forçar sincronização imediata com o Evo CRM. Normalmente atualizações chegam em tempo real via webhook."
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`}
        />
        {isBusy ? "Sincronizando..." : "Sincronizar"}
      </Button>
      {feedback ? (
        <span
          className={`text-[11px] ${
            status === "failed"
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
