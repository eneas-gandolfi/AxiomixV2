/**
 * Arquivo: src/components/whatsapp/auto-assign-button.tsx
 * Propósito: Botao para executar auto-assignment inteligente de conversas.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useCallback } from "react";
import { Zap, Loader2, CheckCircle, X, Settings2 } from "lucide-react";

type AssignmentRule = {
  sentiment?: string;
  intent?: string;
  preferredAgentId?: string;
};

type AssignDetail = {
  conversationId: string;
  contactName: string | null;
  assignedTo: string;
  agentName: string;
  reason: string;
};

type AutoAssignResult = {
  assigned: number;
  skipped: number;
  details: AssignDetail[];
};

type AutoAssignButtonProps = {
  companyId: string;
  agents?: Array<{ id: string; name: string }>;
  onAssigned?: () => void;
};

const SENTIMENT_OPTIONS = [
  { value: "negativo", label: "Negativo" },
  { value: "positivo", label: "Positivo" },
];

const INTENT_OPTIONS = [
  { value: "compra", label: "Compra" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "cancelamento", label: "Cancelamento" },
  { value: "suporte", label: "Suporte" },
];

export function AutoAssignButton({ companyId, agents = [], onAssigned }: AutoAssignButtonProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AutoAssignResult | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/whatsapp/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          limit: 20,
          rules: rules.length > 0 ? rules : undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setShowResult(true);
        onAssigned?.();
      }
    } catch {
      // Silently fail
    } finally {
      setRunning(false);
    }
  }, [companyId, rules, onAssigned]);

  const addRule = () => {
    setRules((prev) => [...prev, {}]);
  };

  const updateRule = (index: number, field: string, value: string) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value || undefined } : r)));
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--module-accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-40"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {running ? "Distribuindo..." : "Auto-Assignment"}
        </button>

        <button
          type="button"
          onClick={() => setShowRules(!showRules)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <Settings2 className="h-4 w-4" />
          Regras
        </button>
      </div>

      {/* Painel de regras */}
      {showRules && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--color-text)]">Regras de Assignment</h4>
            <button
              type="button"
              onClick={addRule}
              className="text-xs text-[var(--module-accent)] hover:underline"
            >
              + Adicionar regra
            </button>
          </div>

          {rules.length === 0 && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Sem regras — será usado round-robin por menor carga de trabalho.
            </p>
          )}

          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] p-2">
              <select
                value={rule.sentiment ?? ""}
                onChange={(e) => updateRule(i, "sentiment", e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)]"
              >
                <option value="">Sentimento...</option>
                {SENTIMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <select
                value={rule.intent ?? ""}
                onChange={(e) => updateRule(i, "intent", e.target.value)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)]"
              >
                <option value="">Intenção...</option>
                {INTENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <span className="text-xs text-[var(--color-text-secondary)]">→</span>

              <select
                value={rule.preferredAgentId ?? ""}
                onChange={(e) => updateRule(i, "preferredAgentId", e.target.value)}
                className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)]"
              >
                <option value="">Agente...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <button type="button" onClick={() => removeRule(i)} className="text-red-400 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Resultado */}
      {showResult && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {result.assigned} conversa{result.assigned !== 1 ? "s" : ""} atribuída{result.assigned !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowResult(false)}
              className="text-green-400 hover:text-green-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {result.details.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.details.map((d, i) => (
                <div key={i} className="text-xs text-green-700">
                  <span className="font-medium">{d.contactName ?? "Sem nome"}</span>
                  {" → "}
                  <span className="font-medium">{d.agentName}</span>
                  <span className="text-green-500"> ({d.reason})</span>
                </div>
              ))}
            </div>
          )}

          {result.skipped > 0 && (
            <p className="mt-2 text-xs text-green-600">
              {result.skipped} conversa{result.skipped !== 1 ? "s" : ""} ignorada{result.skipped !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
