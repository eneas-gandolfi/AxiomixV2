/**
 * Arquivo: src/components/layout/idle-timeout-provider.tsx
 * Propósito: Provider React Context para idle timeout — chama o hook uma única vez e expõe os valores.
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useIdleTimeout } from "@/lib/hooks/use-idle-timeout";

type IdleTimeoutContextValue = ReturnType<typeof useIdleTimeout>;

const IdleTimeoutContext = createContext<IdleTimeoutContextValue | null>(null);

export function IdleTimeoutProvider({ children }: { children: ReactNode }) {
  const value = useIdleTimeout();

  return (
    <IdleTimeoutContext.Provider value={value}>
      {children}
    </IdleTimeoutContext.Provider>
  );
}

export function useIdleTimeoutContext(): IdleTimeoutContextValue {
  const ctx = useContext(IdleTimeoutContext);
  if (!ctx) {
    throw new Error(
      "useIdleTimeoutContext must be used within <IdleTimeoutProvider>"
    );
  }
  return ctx;
}
