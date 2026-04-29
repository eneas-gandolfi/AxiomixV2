/**
 * Card visual para um agente IA na listagem.
 * Controle completo inline: vincular inbox, ativar/desativar, editar.
 */

"use client";

import { useState } from "react";
import { Bot, ExternalLink, Loader2, MessageCircle, Settings, Unplug } from "lucide-react";
import Link from "next/link";
import { AgentTypeBadge } from "./agent-type-badge";

type InboxData = {
  id: string;
  name: string | null;
};

type IntegrationData = {
  id: string;
  provider: string;
  config: Record<string, unknown>;
};

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
  companyId: string;
  inboxes: InboxData[];
  integrations: IntegrationData[];
  onRefresh: () => void;
};

export function AgentCard({ agent, companyId, inboxes, integrations, onRefresh }: AgentCardProps) {
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const inboxIntegration = integrations.find((i) => i.provider === "crm_inbox");
  const linkedInboxId = inboxIntegration
    ? String(inboxIntegration.config.inbox_id ?? "")
    : null;
  const linkedInbox = linkedInboxId
    ? inboxes.find((i) => i.id === linkedInboxId)
    : null;

  const handleToggleActive = async () => {
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/whatsapp/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, is_active: !agent.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro.");
      }
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setActing(false);
    }
  };

  const handleLinkInbox = async (inboxId: string) => {
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/whatsapp/agents/${agent.id}/inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", companyId, inboxId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao vincular.");
      }
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setActing(false);
    }
  };

  const handleUnlinkInbox = async () => {
    if (!inboxIntegration) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/whatsapp/agents/${agent.id}/inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", companyId, integrationId: inboxIntegration.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao desvincular.");
      }
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card transition-all hover:shadow-sm">
      {/* Header — nome, role, status */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              agent.is_active ? "bg-[var(--module-accent)]/10" : "bg-muted/10"
            }`}>
              <Bot className={`h-5 w-5 ${agent.is_active ? "text-[var(--module-accent)]" : "text-muted"}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text truncate">{agent.name}</h3>
              {agent.role && (
                <p className="mt-0.5 text-sm text-muted truncate">{agent.role}</p>
              )}
            </div>
          </div>

          {/* Toggle ativo/inativo */}
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={acting}
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted/10"
            title={agent.is_active ? "Desativar agente" : "Ativar agente"}
          >
            {acting ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted" />
            ) : agent.is_active ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-success">Ativo</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="text-muted">Inativo</span>
              </>
            )}
          </button>
        </div>

        {/* Tipo + Modelo */}
        <div className="mt-3 flex items-center gap-2.5">
          <AgentTypeBadge type={agent.agent_type} />
          {agent.model && (
            <span className="text-xs text-muted truncate">{agent.model}</span>
          )}
        </div>
      </div>

      {/* Canal — seção visual destacada */}
      <div className="px-5 pb-4">
        {linkedInbox ? (
          <div className="flex items-center justify-between rounded-lg border border-success/25 bg-success/5 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="h-4 w-4 text-success" />
              <div>
                <span className="text-sm font-medium text-success">
                  Atendendo
                </span>
                <span className="ml-1.5 text-xs text-success/70">
                  {linkedInbox.name ?? linkedInboxId}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnlinkInbox}
              disabled={acting}
              className="flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
              title="Desvincular do canal"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Desvincular
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-3">
            <p className="mb-2 text-xs text-muted">Sem canal vinculado</p>
            <div className="flex flex-wrap gap-2">
              {inboxes.map((inbox) => (
                <button
                  key={inbox.id}
                  type="button"
                  onClick={() => handleLinkInbox(inbox.id)}
                  disabled={acting}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--module-accent)]/30 bg-[var(--module-accent)]/5 px-3 py-1.5 text-xs font-medium text-[var(--module-accent)] transition-all hover:bg-[var(--module-accent)]/15 disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5" />
                  )}
                  Vincular: {inbox.name ?? inbox.id}
                </button>
              ))}
              {inboxes.length === 0 && (
                <span className="text-xs text-muted italic">Nenhum canal disponível</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {actionError && (
        <div className="mx-5 mb-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {actionError}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <Link
          href={`/whatsapp-intelligence/agentes/${agent.id}?companyId=${companyId}`}
          className="flex items-center gap-2 text-sm text-muted hover:text-[var(--module-accent)] transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar agente
          <ExternalLink className="ml-auto h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
