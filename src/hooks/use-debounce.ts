/**
 * Arquivo: src/hooks/use-debounce.ts
 * Propósito: Hook utilitário para debounce de valores.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
