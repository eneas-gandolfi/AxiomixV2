/**
 * Arquivo: src/components/whatsapp/critical-alerts-badge.tsx
 * Propósito: Badge para indicar conversas críticas que precisam de atenção.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type CriticalAlertsBadgeProps = {
  companyId: string | null;
};

export function CriticalAlertsBadge({ companyId }: CriticalAlertsBadgeProps) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const fetchCriticalCount = async () => {
      try {
        const response = await fetch("/api/whatsapp/critical-count", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });

        if (response.ok) {
          const data = (await response.json()) as { count: number };
          setCount(data.count ?? 0);
        }
      } catch (error) {
        // Silently fail - não queremos quebrar a UI por causa do badge
        console.error("Erro ao buscar contagem de alertas críticos:", error);
      }
    };

    fetchCriticalCount();

    // Atualizar a cada 2 minutos
    const interval = setInterval(fetchCriticalCount, 120000);
    return () => clearInterval(interval);
  }, [companyId, pathname]); // Re-fetch quando a rota mudar

  if (count === 0) {
    return null;
  }

  return (
    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
