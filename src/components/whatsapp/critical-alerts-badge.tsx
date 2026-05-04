/**
 * Arquivo: src/components/whatsapp/critical-alerts-badge.tsx
 * Propósito: Badge para indicar conversas críticas que precisam de atenção.
 * Consome o store singleton compartilhado — não faz fetch próprio.
 * Autor: AXIOMIX
 * Data: 2026-03-12 (refatorado 2026-05-04)
 */

"use client";

import { useCriticalCount } from "@/lib/whatsapp/use-critical-count";

export function CriticalAlertsBadge() {
  const { count } = useCriticalCount();

  if (count === 0) {
    return null;
  }

  return (
    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
