/**
 * Arquivo: src/lib/whatsapp/critical-count-store.ts
 * Propósito: Store singleton para contagem de conversas críticas (negativas 24h).
 * Coalesce fetches in-flight, deduplica chamadas vindas de sidebar/topbar/badge,
 * mantém polling único enquanto houver ≥ 1 listener montado.
 * Autor: AXIOMIX
 * Data: 2026-05-04
 */

const POLL_INTERVAL_MS = 120_000;

type Listener = (count: number) => void;

let currentCount = 0;
const listeners = new Set<Listener>();
let inflight: Promise<number> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let visibilityHandlerAttached = false;

async function fetchCriticalCount(): Promise<number> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/whatsapp/critical-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      if (!res.ok) return currentCount;
      const data = (await res.json()) as { count?: number };
      const next = data.count ?? 0;
      currentCount = next;
      for (const listener of listeners) listener(next);
      return next;
    } catch (err) {
      console.error("[critical-count-store] fetch failed", err);
      return currentCount;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function startPolling() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    void fetchCriticalCount();
  }, POLL_INTERVAL_MS);

  if (typeof document !== "undefined" && !visibilityHandlerAttached) {
    document.addEventListener("visibilitychange", handleVisibility);
    visibilityHandlerAttached = true;
  }
}

function stopPolling() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (typeof document !== "undefined" && visibilityHandlerAttached) {
    document.removeEventListener("visibilitychange", handleVisibility);
    visibilityHandlerAttached = false;
  }
}

function handleVisibility() {
  if (document.visibilityState === "visible" && listeners.size > 0) {
    void fetchCriticalCount();
  }
}

export function subscribeCriticalCount(listener: Listener): () => void {
  listeners.add(listener);
  // Emit current value imediatamente para o novo subscriber.
  listener(currentCount);

  // Primeiro listener: dispara fetch inicial + começa polling.
  if (listeners.size === 1) {
    void fetchCriticalCount();
    startPolling();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopPolling();
  };
}

export function getCriticalCount(): number {
  return currentCount;
}

export function refreshCriticalCount(): Promise<number> {
  return fetchCriticalCount();
}
