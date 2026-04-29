/**
 * Formulário de criação/edição de agente IA.
 * Para admin: todos os campos. Para cliente: apenas ajustes (instructions, is_active).
 */

"use client";

import { useState } from "react";
import { Bot, Cog, ListOrdered, GitFork, Repeat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AGENT_TYPES = [
  { value: "llm", label: "LLM", description: "Responde com linguagem natural. Ideal para atendimento.", icon: Bot },
  { value: "task", label: "Task", description: "Executa uma tarefa específica e retorna resultado.", icon: Cog },
  { value: "sequential", label: "Sequential", description: "Orquestra outros agentes em sequência lógica.", icon: ListOrdered },
  { value: "parallel", label: "Parallel", description: "Dispara múltiplos agentes simultaneamente.", icon: GitFork },
  { value: "loop", label: "Loop", description: "Repete ações até uma condição ser satisfeita.", icon: Repeat },
] as const;

type AgentFormData = {
  name: string;
  description: string;
  agent_type: string;
  role: string;
  goal: string;
  instructions: string;
  model: string;
  is_active: boolean;
};

type AgentFormProps = {
  mode: "create" | "edit" | "adjust";
  initialData?: Partial<AgentFormData>;
  companyId: string;
  agentId?: string;
  onSuccess?: () => void;
};

export function AgentForm({ mode, initialData, companyId, agentId, onSuccess }: AgentFormProps) {
  const [data, setData] = useState<AgentFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    agent_type: initialData?.agent_type ?? "llm",
    role: initialData?.role ?? "",
    goal: initialData?.goal ?? "",
    instructions: initialData?.instructions ?? "",
    model: initialData?.model ?? "",
    is_active: initialData?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdjustMode = mode === "adjust";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = mode === "create"
        ? "/api/whatsapp/agents"
        : `/api/whatsapp/agents/${agentId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const body = isAdjustMode
        ? { companyId, instructions: data.instructions, is_active: data.is_active }
        : { companyId, ...data };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erro ao salvar agente.");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof AgentFormData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Nome e descrição — só admin */}
      {!isAdjustMode && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Nome do Agente</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex: Atendente WhatsApp"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Descrição</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Breve descrição do propósito do agente"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
            />
          </div>
        </>
      )}

      {/* Tipo — só na criação */}
      {mode === "create" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-text">Tipo do Agente</label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_TYPES.map((type) => {
              const Icon = type.icon;
              const selected = data.agent_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => update("agent_type", type.value)}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? "border-[var(--module-accent)] bg-[var(--module-accent)]/5 ring-1 ring-[var(--module-accent)]"
                      : "border-border bg-card hover:border-muted"
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-[var(--module-accent)]" : "text-muted"}`} />
                  <div>
                    <p className={`text-sm font-medium ${selected ? "text-[var(--module-accent)]" : "text-text"}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role e Goal — só admin */}
      {!isAdjustMode && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Role</label>
            <input
              type="text"
              value={data.role}
              onChange={(e) => update("role", e.target.value)}
              placeholder="Ex: Especialista em suporte técnico"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Goal</label>
            <input
              type="text"
              value={data.goal}
              onChange={(e) => update("goal", e.target.value)}
              placeholder="Ex: Resolver dúvidas técnicas rapidamente"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
            />
          </div>
        </div>
      )}

      {/* Instruções — admin e cliente */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          {isAdjustMode ? "Instruções de comportamento" : "Instruções (System Prompt)"}
        </label>
        <textarea
          value={data.instructions}
          onChange={(e) => update("instructions", e.target.value)}
          placeholder={isAdjustMode
            ? "Ajuste o tom e comportamento do agente..."
            : "Instruções detalhadas para o agente..."
          }
          rows={isAdjustMode ? 4 : 6}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
        />
      </div>

      {/* Modelo IA — só admin */}
      {!isAdjustMode && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Modelo de IA</label>
          <input
            type="text"
            value={data.model}
            onChange={(e) => update("model", e.target.value)}
            placeholder="Ex: gpt-4o, claude-sonnet-4-20250514"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-[var(--module-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]"
          />
        </div>
      )}

      {/* Status ativo/inativo — admin e cliente */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => update("is_active", !data.is_active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            data.is_active ? "bg-[var(--module-accent)]" : "bg-muted/30"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              data.is_active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-text">
          {data.is_active ? "Agente ativo" : "Agente inativo"}
        </span>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Ativar Agente" : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
