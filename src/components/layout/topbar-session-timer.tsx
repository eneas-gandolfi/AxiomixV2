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
  const { state, countdown, remainingMinutes } = useIdleTimeoutContext();

  if (state === "expired") return null;

  if (state === "warning") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-[var(--color-hover)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-danger)] animate-pulse"
        title="Tempo restante da sessão"
      >
        <Timer size={12} aria-hidden="true" />
        {formatCountdown(countdown)}
      </span>
    );
  }

  // state === "active"
  let textColor = "text-[var(--color-muted)]";
  let extraClass = "";
  if (remainingMinutes <= 2) {
    textColor = "text-[var(--color-danger)]";
    extraClass = " animate-pulse";
  } else if (remainingMinutes <= 5) {
    textColor = "text-[var(--color-warning)]";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-[var(--color-hover)] px-1.5 py-0.5 font-mono text-xs ${textColor}${extraClass}`}
      title="Tempo restante da sessão"
    >
      <Timer size={12} aria-hidden="true" />
      {remainingMinutes} min
    </span>
  );
}
