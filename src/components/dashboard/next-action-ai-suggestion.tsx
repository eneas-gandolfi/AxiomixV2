/**
 * Arquivo: src/components/dashboard/next-action-ai-suggestion.tsx
 * Propósito: Mostra sugestão de resposta gerada por IA logo abaixo do CTA do
 *            herói NextAction. Carrega em background — não bloqueia o card.
 *            Em caso de erro/AI indisponível, falha silenciosamente (não polui
 *            a UI de empty/error state, o card herói já cumpre seu papel).
 *
 *            Fase 3 final do redesign de dashboard — herói laranja focal.
 * Autor: AXIOMIX
 * Data: 2026-05-13
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "ready"; suggestion: string }
  | { kind: "error" };

export function NextActionAiSuggestion({
  companyId,
  conversationId,
}: {
  companyId: string;
  conversationId: string;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ kind: "loading" });

    fetch("/api/dashboard/next-action-suggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, conversationId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { suggestion?: string };
        if (!json.suggestion) throw new Error("empty");
        if (!controller.signal.aborted) {
          setState({ kind: "ready", suggestion: json.suggestion });
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (!controller.signal.aborted) setState({ kind: "error" });
      });

    return () => {
      controller.abort();
    };
  }, [companyId, conversationId]);

  function handleCopy() {
    if (state.kind !== "ready") return;
    void navigator.clipboard.writeText(state.suggestion);
    setCopied(true);
    if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    copyResetTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  if (state.kind === "error") {
    // Silencioso. O card herói já cumpre seu papel sem a sugestão.
    return null;
  }

  return (
    <div className="mt-4 rounded-xl bg-white/15 p-3 backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Sugestão da IA
      </div>

      {state.kind === "loading" ? (
        <div className="space-y-1.5" aria-busy="true" aria-label="Gerando sugestão de resposta">
          <div className="h-3 w-full animate-pulse rounded bg-white/25" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/25" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-white/25" />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[13px] leading-snug text-white">
            {state.suggestion}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copiar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
