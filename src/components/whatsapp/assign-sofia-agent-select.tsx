/**
 * Arquivo: src/components/whatsapp/assign-sofia-agent-select.tsx
 * Propósito: Select para atribuir conversa a um agente/time da Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Agent = { id: string; name: string | null };
type Team = { id: string; name: string | null };

type AssignSofiaAgentSelectProps = {
  companyId: string;
  conversationExternalId: string;
  onAssigned?: () => void;
};

export function AssignSofiaAgentSelect({
  companyId,
  conversationExternalId,
  onAssigned,
}: AssignSofiaAgentSelectProps) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function loadOptions() {
      setLoading(true);
      try {
        const [usersRes, teamsRes] = await Promise.all([
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listUsers" }),
          }),
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listTeams" }),
          }),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          setAgents(data.users ?? []);
        }
        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.teams ?? []);
        }
      } catch {
        setError("Erro ao carregar opções.");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [open, companyId]);

  const handleAssign = async (type: "user" | "team", id: string) => {
    setAssigning(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "assignConversation",
          conversationExternalId,
          ...(type === "user" ? { assigneeId: id } : { teamId: id }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao atribuir.");
      }

      setOpen(false);
      onAssigned?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atribuir.");
    } finally {
      setAssigning(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Atribuir
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <p className="mb-2 text-xs font-medium text-text">Atribuir conversa</p>
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {agents.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Agentes</p>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign("user", agent.id)}
                  disabled={assigning}
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-text hover:bg-sidebar transition-colors"
                >
                  {agent.name ?? agent.id}
                </button>
              ))}
            </>
          )}
          {teams.length > 0 && (
            <>
              <p className="mt-2 text-xs font-medium text-muted uppercase tracking-wide">Times</p>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleAssign("team", team.id)}
                  disabled={assigning}
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-text hover:bg-sidebar transition-colors"
                >
                  {team.name ?? team.id}
                </button>
              ))}
            </>
          )}
          {agents.length === 0 && teams.length === 0 && (
            <p className="py-2 text-xs text-muted">Nenhum agente ou time encontrado.</p>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 w-full"
        onClick={() => setOpen(false)}
      >
        Cancelar
      </Button>
    </div>
  );
}
