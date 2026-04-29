/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/agentes/page.tsx
 * Propósito: Listagem de agentes IA com cards visuais.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect } from "react";
import { Bot, Loader2, Plus } from "lucide-react";
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

export default function AgentsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
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

  useEffect(() => {
    if (!companyId) return;

    async function fetchAgents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/whatsapp/agents?companyId=${companyId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao carregar agentes.");
        }
        const data = await res.json();
        setAgents(data.agents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar agentes.");
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, [companyId]);

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--module-accent)]" />
          <h2 className="text-lg font-semibold text-text">Agentes IA</h2>
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
            {agents.length}
          </span>
        </div>
        <Link href="/whatsapp-intelligence/agentes/novo">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Agente
          </Button>
        </Link>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              href={`/whatsapp-intelligence/agentes/${agent.id}?companyId=${companyId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
