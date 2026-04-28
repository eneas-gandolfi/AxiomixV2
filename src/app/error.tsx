"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service when available (Story 0.2b)
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
      <h2 className="font-display text-xl text-[var(--color-text)]">
        Algo deu errado
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <button
        onClick={reset}
        className="h-10 rounded-md bg-[#FA5E24] px-4 text-sm font-medium text-white transition-colors hover:bg-[#E84D13]"
      >
        Tentar novamente
      </button>
    </div>
  );
}
