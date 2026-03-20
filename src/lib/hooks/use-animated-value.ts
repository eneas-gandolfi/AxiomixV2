/**
 * Arquivo: src/lib/hooks/use-animated-value.ts
 * Propósito: Hook para animar números de 0 até o valor alvo com easeOutExpo
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { useEffect, useRef, useState } from "react";

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useAnimatedValue(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutExpo(progress) * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
