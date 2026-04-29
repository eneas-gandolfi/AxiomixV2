/**
 * Badge visual para tipo de agente IA.
 * Cada tipo tem cor e label distintos.
 */

import { Bot, Cog, ListOrdered, GitFork, Repeat } from "lucide-react";

const AGENT_TYPE_CONFIG = {
  llm: { label: "LLM", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Bot },
  task: { label: "Task", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Cog },
  sequential: { label: "Sequential", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: ListOrdered },
  parallel: { label: "Parallel", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: GitFork },
  loop: { label: "Loop", color: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: Repeat },
} as const;

type AgentType = keyof typeof AGENT_TYPE_CONFIG;

export function AgentTypeBadge({ type }: { type: string }) {
  const config = AGENT_TYPE_CONFIG[type as AgentType] ?? AGENT_TYPE_CONFIG.llm;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
