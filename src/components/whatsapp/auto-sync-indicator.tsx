/**
 * Arquivo: src/components/whatsapp/auto-sync-indicator.tsx
 * Propósito: Indicador de sincronização automática com contagem regressiva.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

type AutoSyncIndicatorProps = {
  companyId: string;
  intervalSeconds?: number;
};

export function AutoSyncIndicator({ companyId, intervalSeconds = 60 }: AutoSyncIndicatorProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doSync = useCallback(async () => {
    setSyncing(true);
    setError(false);
    try {
      const response = await fetch("/api/sofia-crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (response.ok) {
        setLastSyncAt(new Date());
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSyncing(false);
      setSecondsLeft(intervalSeconds);
    }
  }, [companyId, intervalSeconds, router]);

  useEffect(() => {
    if (paused) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          doSync();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, intervalSeconds, doSync]);

  // Pausar quando tab não está visível
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setPaused(true);
      } else {
        setPaused(false);
        // Sync imediato ao voltar para a tab
        doSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [doSync]);

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      {syncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin text-[#2EC4B6]" />
          <span className="text-[#2EC4B6]">Sincronizando...</span>
        </>
      ) : error ? (
        <>
          <WifiOff className="h-3 w-3 text-danger" />
          <span>Erro ao sincronizar</span>
          <span className="text-muted-light">· próxima em {formatTime(secondsLeft)}</span>
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3 text-success" />
          {lastSyncAt && (
            <span>Última sync: {lastSyncAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          <span className="text-muted-light">· próxima em {formatTime(secondsLeft)}</span>
        </>
      )}
      <button
        onClick={() => { setSecondsLeft(0); doSync(); }}
        disabled={syncing}
        className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-text hover:bg-sidebar transition-colors"
        title="Sincronizar agora"
      >
        <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
