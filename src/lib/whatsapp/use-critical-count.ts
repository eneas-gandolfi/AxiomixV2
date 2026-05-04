/**
 * Arquivo: src/lib/whatsapp/use-critical-count.ts
 * Propósito: Hook React para consumir o store singleton de critical-count.
 * Garante que sidebar, topbar e badge compartilhem 1 única chamada de rede.
 * Autor: AXIOMIX
 * Data: 2026-05-04
 */

"use client";

import { useEffect, useState } from "react";
import {
  getCriticalCount,
  refreshCriticalCount,
  subscribeCriticalCount,
} from "./critical-count-store";

export function useCriticalCount(): { count: number; refresh: () => Promise<number> } {
  const [count, setCount] = useState<number>(getCriticalCount);

  useEffect(() => {
    return subscribeCriticalCount(setCount);
  }, []);

  return { count, refresh: refreshCriticalCount };
}
