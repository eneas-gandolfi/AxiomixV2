/**
 * Arquivo: src/components/layout/topbar-session-timer.tsx
 * Propósito: Pill discreta na topbar que exibe minutos restantes até o aviso de inatividade.
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

"use client";

import { Timer } from "lucide-react";
import { useIdleTimeoutContext } from "@/components/layout/idle-timeout-provider";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TopbarSessionTimer() {
  const { state, countdown, remainingSeconds } = useIdleTimeoutContext();

  if (state === "expired") return null;

  // During warning state, show the modal countdown
  const seconds = state === "warning" ? countdown : remainingSeconds;

  let textColor = "text-[var(--color-muted)]";
  let extraClass = "";

  if (state === "warning" || seconds <= 120) {
    textColor = "text-[var(--color-danger)]";
    extraClass = " animate-pulse";
  } else if (seconds <= 300) {
    textColor = "text-[var(--color-warning)]";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-[var(--color-hover)] px-1.5 py-0.5 font-mono text-xs ${textColor}${extraClass}`}
      title="Tempo restante da sessão"
    >
      <Timer size={12} aria-hidden="true" />
      {formatCountdown(seconds)}
    </span>
  );
}
