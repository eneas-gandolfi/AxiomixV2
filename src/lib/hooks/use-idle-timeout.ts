/**
 * Arquivo: src/lib/hooks/use-idle-timeout.ts
 * Propósito: Hook que rastreia inatividade do usuário e gerencia idle timeout com countdown.
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ACTIVITY_EVENTS,
  IDLE_COUNTDOWN_SECONDS,
  IDLE_WARNING_MS,
  REMEMBER_ME_COOKIE,
} from "@/lib/auth/constants";

type IdleState = "active" | "warning" | "expired";

export function useIdleTimeout() {
  const [state, setState] = useState<IdleState>("active");
  const [countdown, setCountdown] = useState(IDLE_COUNTDOWN_SECONDS);
  const router = useRouter();

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const stateRef = useRef<IdleState>("active");

  // Keep ref in sync with state so event listeners see the latest value
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    clearAllTimers();
    setState("expired");
    document.cookie = `${REMEMBER_ME_COOKIE}=; path=/; max-age=0`;
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login?reason=idle");
  }, [clearAllTimers, router]);

  const startWarningCountdown = useCallback(() => {
    setCountdown(IDLE_COUNTDOWN_SECONDS);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_COUNTDOWN_SECONDS * 1000);
  }, [logout]);

  const startWarningTimer = useCallback(() => {
    clearAllTimers();
    warningTimerRef.current = setTimeout(() => {
      setState("warning");
      startWarningCountdown();
    }, IDLE_WARNING_MS);
  }, [clearAllTimers, startWarningCountdown]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setState("active");
    setCountdown(IDLE_COUNTDOWN_SECONDS);
    lastActivityRef.current = Date.now();
    startWarningTimer();
  }, [clearAllTimers, startWarningTimer]);

  // Activity listeners — only reset during "active" state, throttled to 1/s
  useEffect(() => {
    const handleActivity = () => {
      if (stateRef.current !== "active") return;

      const now = Date.now();
      if (now - lastActivityRef.current < 1000) return;
      lastActivityRef.current = now;

      // Reset the warning timer on activity
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      warningTimerRef.current = setTimeout(() => {
        setState("warning");
        startWarningCountdown();
      }, IDLE_WARNING_MS);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [startWarningCountdown]);

  // Start the initial timer on mount
  useEffect(() => {
    startWarningTimer();
    return () => {
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, countdown, resetTimer, logout };
}
