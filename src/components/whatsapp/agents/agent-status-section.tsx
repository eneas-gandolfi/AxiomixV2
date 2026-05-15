/**
 * Seção "Status atual" — grid de cards mostrando estado consolidado do agente:
 * is_active, canal vinculado, modelo IA e tipo. Server-rendered, sem fetch próprio.
 */

import { Bot, MessageCircle, Power, Sparkles } from "lucide-react";

type AgentStatusSectionProps = {
  isActive: boolean;
  agentType: string;
  model: string | null;
  linkedChannel: {
    name: string | null;
    provider: string;
  } | null;
};

export function AgentStatusSection({
  isActive,
  agentType,
  model,
  linkedChannel,
}: AgentStatusSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatusCard
        icon={<Power className="h-4 w-4" />}
        label="Status"
        value={isActive ? "Ativo" : "Inativo"}
        tone={isActive ? "success" : "muted"}
      />
      <StatusCard
        icon={<MessageCircle className="h-4 w-4" />}
        label="Canal vinculado"
        value={linkedChannel?.name ?? "Sem canal"}
        hint={linkedChannel?.provider}
        tone={linkedChannel ? "success" : "muted"}
      />
      <StatusCard
        icon={<Sparkles className="h-4 w-4" />}
        label="Modelo IA"
        value={model ?? "—"}
        tone="default"
      />
      <StatusCard
        icon={<Bot className="h-4 w-4" />}
        label="Tipo de agente"
        value={formatAgentType(agentType)}
        tone="default"
      />
    </div>
  );
}

type StatusCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "success" | "muted" | "default";
};

function StatusCard({ icon, label, value, hint, tone }: StatusCardProps) {
  const valueClass =
    tone === "success" ? "text-success" : tone === "muted" ? "text-muted" : "text-text";
  const iconClass =
    tone === "success" ? "text-success" : tone === "muted" ? "text-muted" : "text-[var(--module-accent)]";

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
        <span className={iconClass}>{icon}</span>
        {label}
      </div>
      <div className={`truncate text-sm font-medium ${valueClass}`} title={value}>
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 truncate text-[11px] text-muted" title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}

function formatAgentType(type: string): string {
  const labels: Record<string, string> = {
    llm: "Conversacional (LLM)",
    task: "Tarefa",
    sequential: "Sequencial",
    parallel: "Paralelo",
    loop: "Loop",
  };
  return labels[type.toLowerCase()] ?? type;
}
