/**
 * Switch isolado para toggle de is_active do agente.
 * Disparado no header da página detalhe.
 */

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type AgentActiveSwitchProps = {
  agentId: string;
  companyId: string;
  initialActive: boolean;
  onToggled?: (next: boolean) => void;
};

export function AgentActiveSwitch({
  agentId,
  companyId,
  initialActive,
  onToggled,
}: AgentActiveSwitchProps) {
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    const next = !active;
    try {
      const res = await fetch(`/api/whatsapp/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, is_active: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao atualizar status.");
      }
      setActive(next);
      onToggled?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-pressed={active}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
          active ? "border-success/40 bg-success/20" : "border-border bg-muted/10"
        }`}
        title={active ? "Desativar agente" : "Ativar agente"}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            active ? "translate-x-6 bg-success" : "translate-x-1 bg-muted"
          }`}
        />
        {pending && (
          <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-muted" />
        )}
      </button>
      <span className={`text-xs ${active ? "text-success" : "text-muted"}`}>
        {active ? "Ativo" : "Inativo"}
      </span>
      {error && (
        <span className="text-[10px] text-danger" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
