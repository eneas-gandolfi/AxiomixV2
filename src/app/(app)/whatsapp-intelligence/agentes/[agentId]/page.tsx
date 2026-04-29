/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/agentes/[agentId]/page.tsx
 * Propósito: Detalhe e edição de agente IA.
 *   - Admin: edição completa (todos os campos)
 *   - Cliente: painel de ajuste (instructions, is_active apenas)
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentForm } from "@/components/whatsapp/agents/agent-form";
import { AgentTypeBadge } from "@/components/whatsapp/agents/agent-type-badge";
import { AgentInboxLink } from "@/components/whatsapp/agents/agent-inbox-link";

export const dynamic = "force-dynamic";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  role: string | null;
  goal: string | null;
  instructions: string | null;
  model: string | null;
  is_active: boolean;
};

type PageProps = {
  params: Promise<{ agentId: string }>;
};

export default function AgentDetailPage({ params }: PageProps) {
  const { agentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(
    searchParams.get("companyId")
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // TODO: determinar role do usuário para mostrar form completo ou ajuste
  const isAdmin = true; // placeholder — integrar com auth real

  useEffect(() => {
    if (companyId) return;
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
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    async function fetchAgent() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/whatsapp/agents/${agentId}?companyId=${companyId}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Agente não encontrado.");
        }
        const data = await res.json();
        setAgent(data.agent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar agente.");
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [companyId, agentId]);

  const handleDelete = async () => {
    if (!companyId || !confirm("Tem certeza que deseja excluir este agente?")) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/whatsapp/agents/${agentId}?companyId=${companyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao excluir agente.");
      }
      router.push("/whatsapp-intelligence/agentes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
      setDeleting(false);
    }
  };

  if (loading || !companyId) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/whatsapp-intelligence/agentes"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error ?? "Agente não encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/whatsapp-intelligence/agentes"
            className="rounded-lg p-1.5 text-muted hover:bg-muted/10 hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text">{agent.name}</h2>
              <AgentTypeBadge type={agent.agent_type} />
            </div>
            {agent.role && (
              <p className="text-xs text-muted">{agent.role}</p>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Excluir
          </Button>
        )}
      </div>

      {/* Vinculação ao canal WhatsApp */}
      <div className="rounded-xl border border-border bg-card p-6">
        <AgentInboxLink companyId={companyId} agentId={agentId} />
      </div>

      {/* Formulário de edição */}
      <div className="rounded-xl border border-border bg-card p-6">
        <AgentForm
          mode={isAdmin ? "edit" : "adjust"}
          initialData={{
            name: agent.name,
            description: agent.description ?? "",
            agent_type: agent.agent_type,
            role: agent.role ?? "",
            goal: agent.goal ?? "",
            instructions: agent.instructions ?? "",
            model: agent.model ?? "",
            is_active: agent.is_active,
          }}
          companyId={companyId}
          agentId={agentId}
          onSuccess={() => router.push("/whatsapp-intelligence/agentes")}
        />
      </div>
    </div>
  );
}
