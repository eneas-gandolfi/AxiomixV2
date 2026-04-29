/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/agentes/page.tsx
 * Propósito: Listagem de agentes IA com controle completo inline.
 * O usuário pode vincular/desvincular inbox e ativar/desativar direto nos cards.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/whatsapp/agents/agent-card";

export const dynamic = "force-dynamic";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  role: string | null;
  model: string | null;
  is_active: boolean;
};

type Inbox = {
  id: string;
  name: string | null;
};

type Integration = {
  id: string;
  provider: string;
  config: Record<string, unknown>;
};

export default function AgentsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [integrationsByAgent, setIntegrationsByAgent] = useState<Record<string, Integration[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id");
        if (res.ok) {
          const data = await res.json();
          setCompanyId(data.companyId);
        }
      } catch {
        // Silently fail
      }
    }
    getCompany();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      // Buscar agentes e inboxes em paralelo
      const [agentsRes, inboxesRes] = await Promise.all([
        fetch(`/api/whatsapp/agents?companyId=${companyId}`),
        fetch("/api/whatsapp/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, action: "listInboxes" }),
        }),
      ]);

      let agentsList: Agent[] = [];
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        agentsList = data.agents ?? [];
        setAgents(agentsList);
      } else {
        const data = await agentsRes.json();
        throw new Error(data.error ?? "Erro ao carregar agentes.");
      }

      if (inboxesRes.ok) {
        const data = await inboxesRes.json();
        setInboxes(data.inboxes ?? []);
      }

      // Buscar integrações de cada agente em paralelo
      const integrationPromises = agentsList.map(async (agent) => {
        try {
          const res = await fetch(`/api/whatsapp/agents/${agent.id}/inbox?companyId=${companyId}`);
          if (res.ok) {
            const data = await res.json();
            return { agentId: agent.id, integrations: data.integrations ?? [] };
          }
        } catch {
          // silently fail per agent
        }
        return { agentId: agent.id, integrations: [] };
      });

      const integrationResults = await Promise.all(integrationPromises);
      const map: Record<string, Integration[]> = {};
      for (const { agentId, integrations } of integrationResults) {
        map[agentId] = integrations;
      }
      setIntegrationsByAgent(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--module-accent)]" />
          <h2 className="text-lg font-semibold text-text">Agentes IA</h2>
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
            {agents.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchAll}
            className="gap-1.5"
            title="Atualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Link href="/whatsapp-intelligence/agentes/novo">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Agente
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumo rápido de status */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {agents.filter((a) => a.is_active).length} ativo{agents.filter((a) => a.is_active).length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/10 px-3 py-1 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
            {agents.filter((a) => !a.is_active).length} inativo{agents.filter((a) => !a.is_active).length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {Object.values(integrationsByAgent).filter((ints) =>
              ints.some((i) => i.provider === "crm_inbox")
            ).length} vinculado{Object.values(integrationsByAgent).filter((ints) =>
              ints.some((i) => i.provider === "crm_inbox")
            ).length !== 1 ? "s" : ""} a canal
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {agents.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bot className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-sm font-medium text-text">Nenhum agente configurado</p>
          <p className="mt-1 text-xs text-muted">
            Crie seu primeiro agente IA para automatizar atendimentos.
          </p>
          <Link href="/whatsapp-intelligence/agentes/novo" className="mt-4">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar Agente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              companyId={companyId}
              inboxes={inboxes}
              integrations={integrationsByAgent[agent.id] ?? []}
              onRefresh={fetchAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
