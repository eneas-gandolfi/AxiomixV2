/**
 * Arquivo: src/components/whatsapp/auto-sync-indicator.tsx
 * Propósito: Indicador de sincronização automática com contagem regressiva.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Wifi, WifiOff, Pause, Play } from "lucide-react";
import {
  requestSofiaSync,
  useSofiaSyncStatus,
} from "@/components/whatsapp/sofia-sync-client";

type AutoSyncIndicatorProps = {
  companyId: string;
  intervalSeconds?: number;
};

const MAX_BACKOFF_SECONDS = 300;

export function AutoSyncIndicator({ companyId, intervalSeconds = 60 }: AutoSyncIndicatorProps) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const [currentInterval, setCurrentInterval] = useState(intervalSeconds);
  const [pausedByVisibility, setPausedByVisibility] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const nextSyncAtRef = useRef(Date.now() + intervalSeconds * 1000);
  const { syncing, activeMode, lastSyncAt, errorMessage, progress } = useSofiaSyncStatus(companyId);
  const syncingRef = useRef(syncing);

  const isEffectivelyPaused = pausedByVisibility || isManuallyPaused;

  const scheduleNextSync = useCallback((delaySeconds: number) => {
    const normalizedDelay = Math.max(1, delaySeconds);
    nextSyncAtRef.current = Date.now() + normalizedDelay * 1000;
    setSecondsLeft(normalizedDelay);
  }, []);

  useEffect(() => {
    syncingRef.current = syncing;
  }, [syncing]);

  useEffect(() => {
    if (syncing && activeMode !== "messages_only") {
      consecutiveFailuresRef.current = 0;
      setCurrentInterval(intervalSeconds);
      scheduleNextSync(intervalSeconds);
    }
  }, [activeMode, intervalSeconds, scheduleNextSync, syncing]);

  useEffect(() => {
    if (lastSyncAt) {
      scheduleNextSync(currentInterval);
    }
  }, [currentInterval, lastSyncAt, scheduleNextSync]);

  useEffect(() => {
    scheduleNextSync(intervalSeconds);
  }, [intervalSeconds, scheduleNextSync]);

  const doSync = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    try {
      await requestSofiaSync({ companyId, mode: "messages_only" });
      consecutiveFailuresRef.current = 0;
      setCurrentInterval(intervalSeconds);

      // Disparar análise batch leve em background (best-effort)
      try {
        await fetch("/api/cron/whatsapp-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
      } catch {
        // Silencioso — análise batch é best-effort
      }
    } catch {
      consecutiveFailuresRef.current += 1;
      const backoff = Math.min(
        intervalSeconds * Math.pow(2, consecutiveFailuresRef.current),
        MAX_BACKOFF_SECONDS,
      );
      setCurrentInterval(backoff);
      scheduleNextSync(backoff);
    }
  }, [companyId, intervalSeconds, scheduleNextSync]);

  useEffect(() => {
    if (isEffectivelyPaused) {
      return;
    }

    timerRef.current = setInterval(() => {
      if (syncingRef.current) {
        return;
      }

      const remainingSeconds = Math.max(0, Math.ceil((nextSyncAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        scheduleNextSync(currentInterval);
        void doSync();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [doSync, currentInterval, isEffectivelyPaused, scheduleNextSync]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setPausedByVisibility(true);
        return;
      }

      setPausedByVisibility(false);
      if (!isManuallyPaused && !syncingRef.current) {
        const remainingSeconds = Math.max(0, Math.ceil((nextSyncAtRef.current - Date.now()) / 1000));
        setSecondsLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          scheduleNextSync(currentInterval);
          void doSync();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentInterval, doSync, isManuallyPaused, scheduleNextSync]);

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
          <span className="text-[#2EC4B6]">
            {activeMode === "messages_only"
              ? "Atualizando mensagens..."
              : progress && progress.totalConversations > 0
                ? `Sincronizando conversas... ${progress.processedConversations}/${progress.totalConversations}`
                : "Sincronizando conversas..."}
          </span>
        </>
      ) : errorMessage ? (
        <>
          <WifiOff className="h-3 w-3 text-danger" />
          <span>Erro ao sincronizar</span>
          <span className="text-muted-light"> - proxima em {formatTime(secondsLeft)}</span>
        </>
      ) : isManuallyPaused ? (
        <>
          <Pause className="h-3 w-3 text-warning" />
          <span>Auto-sync pausado</span>
          {lastSyncAt ? (
            <span className="text-muted-light">
              {" - "}Ultima sync:{" "}
              {new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <Wifi className="h-3 w-3 text-success" />
          {lastSyncAt ? (
            <span>
              Ultima sync:{" "}
              {new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
          <span className="text-muted-light"> - proxima em {formatTime(secondsLeft)}</span>
        </>
      )}

      <div className="ml-1 flex items-center">
        <button
          onClick={() => setIsManuallyPaused(!isManuallyPaused)}
          disabled={syncing}
          className="rounded px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-sidebar hover:text-text"
          title={isManuallyPaused ? "Retomar auto-sync" : "Pausar auto-sync"}
        >
          {isManuallyPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        <button
          onClick={() => {
            if (!syncingRef.current) {
              scheduleNextSync(currentInterval);
              void doSync();
            }
          }}
          disabled={syncing}
          className="rounded px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-sidebar hover:text-text"
          title="Sincronizar agora"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
