/**
 * Arquivo: src/components/whatsapp/painel-mode-toggle.tsx
 * Proposito: Toggle segmentado "Ao vivo / Historico" do Painel da Inteligencia.
 *            Altera o searchParam ?modo= preservando outros params; server-side
 *            re-renderiza com o conteudo correto (Operacao ao vivo vs
 *            Inteligencia Comercial historica).
 *
 *            Decisao do redesign 7->3 abas (Sally/John/Quinn em party mode):
 *            uma porta, dois modos mentais — manha = bombeiro (Ao vivo),
 *            fim-de-dia = estrategista (Historico).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";

export type PainelModo = "agora" | "historico";

export const PAINEL_MODO_DEFAULT: PainelModo = "agora";

export function parsePainelModo(value: string | string[] | undefined): PainelModo {
  if (Array.isArray(value)) value = value[0];
  return value === "historico" ? "historico" : "agora";
}

export function PainelModeToggle({ active }: { active: PainelModo }) {
  const router = useRouter();
  const params = useSearchParams();

  const handleSelect = useCallback(
    (next: PainelModo) => {
      if (next === active) return;
      const updated = new URLSearchParams(params?.toString());
      if (next === PAINEL_MODO_DEFAULT) {
        updated.delete("modo");
      } else {
        updated.set("modo", next);
      }
      const qs = updated.toString();
      router.replace(qs ? `/whatsapp-intelligence?${qs}` : "/whatsapp-intelligence", {
        scroll: false,
      });
    },
    [active, params, router],
  );

  return (
    <div
      role="tablist"
      aria-label="Modo do Painel"
      className="inline-flex gap-px rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "agora"}
        onClick={() => handleSelect("agora")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-all ${
          active === "agora"
            ? "bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-[0_1px_2px_rgba(26,23,20,.08),0_0_0_1px_var(--color-border-subtle,_rgba(0,0,0,.05))]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        }`}
      >
        <LiveDot active={active === "agora"} />
        Ao vivo
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "historico"}
        onClick={() => handleSelect("historico")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-all ${
          active === "historico"
            ? "bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-[0_1px_2px_rgba(26,23,20,.08),0_0_0_1px_var(--color-border-subtle,_rgba(0,0,0,.05))]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        }`}
      >
        <Clock className="h-3 w-3" />
        Histórico
      </button>
    </div>
  );
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={`relative inline-flex h-2 w-2 rounded-full ${
        active ? "bg-[var(--color-danger,#ff4d4f)]" : "bg-[var(--color-text-tertiary)]"
      }`}
      aria-hidden="true"
    >
      {active ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-danger,#ff4d4f)] opacity-60" />
      ) : null}
    </span>
  );
}
