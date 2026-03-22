/**
 * Arquivo: src/components/layout/idle-timeout-modal.tsx
 * Propósito: Modal de aviso de inatividade com countdown e botões para continuar ou sair.
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdleTimeout } from "@/lib/hooks/use-idle-timeout";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function IdleTimeoutModal() {
  const { state, countdown, resetTimer, logout } = useIdleTimeout();

  if (state !== "warning") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
            <Clock className="h-6 w-6 text-[var(--color-warning)]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Sessão inativa
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Você será desconectado automaticamente por inatividade.
            </p>
          </div>

          <span className="font-mono text-3xl font-bold text-[var(--color-warning)]">
            {formatCountdown(countdown)}
          </span>

          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={logout}
            >
              Sair
            </Button>
            <Button
              className="flex-1"
              onClick={resetTimer}
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
