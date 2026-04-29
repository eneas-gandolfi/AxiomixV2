/**
 * Card visual para um agente IA na listagem.
 * Mostra: nome, tipo, status, descrição resumida.
 */

"use client";

import { Bot, Power, PowerOff } from "lucide-react";
import { AgentTypeBadge } from "./agent-type-badge";

type AgentCardData = {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  role: string | null;
  model: string | null;
  is_active: boolean;
};

type AgentCardProps = {
  agent: AgentCardData;
  href: string;
};

export function AgentCard({ agent, href }: AgentCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-[var(--module-accent)]/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--module-accent)]/10">
            <Bot className="h-4.5 w-4.5 text-[var(--module-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-text group-hover:text-[var(--module-accent)] transition-colors">
              {agent.name}
            </h3>
            {agent.role && (
              <p className="text-xs text-muted line-clamp-1">{agent.role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {agent.is_active ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <Power className="h-3 w-3" />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted">
              <PowerOff className="h-3 w-3" />
              Inativo
            </span>
          )}
        </div>
      </div>

      {agent.description && (
        <p className="text-xs text-muted line-clamp-2">{agent.description}</p>
      )}

      <div className="flex items-center gap-2">
        <AgentTypeBadge type={agent.agent_type} />
        {agent.model && (
          <span className="text-xs text-muted-light">{agent.model}</span>
        )}
      </div>
    </a>
  );
}
