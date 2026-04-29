/**
 * Card visual para um agente IA na listagem.
 * Controle completo inline: vincular inbox, ativar/desativar, editar.
 */

"use client";

import { useState } from "react";
import { Bot, ExternalLink, Loader2, MessageCircle, Power, PowerOff, Settings, Unplug } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  // Encontrar integração de inbox deste agente
  const agentIntegrations = integrations.filter((i) => i.config.agent_id === agent.id || true);
  // Na verdade, integrations já vem filtradas por agente da página
  const inboxIntegration = integrations.find(
    (i) => i.provider === "crm_inbox"
  );
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
      {/* Header do card */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            agent.is_active ? "bg-[var(--module-accent)]/10" : "bg-muted/10"
          }`}>
            <Bot className={`h-5 w-5 ${agent.is_active ? "text-[var(--module-accent)]" : "text-muted"}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{agent.name}</h3>
            {agent.role && (
              <p className="text-xs text-muted line-clamp-1">{agent.role}</p>
            )}
          </div>
        </div>

        {/* Toggle ativo/inativo */}
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={acting}
          className="group/toggle flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors hover:bg-muted/10"
          title={agent.is_active ? "Desativar agente" : "Ativar agente"}
        >
          {acting ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted" />
          ) : agent.is_active ? (
            <>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-success group-hover/toggle:text-danger">Ativo</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted" />
              <span className="text-muted group-hover/toggle:text-success">Inativo</span>
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <AgentTypeBadge type={agent.agent_type} />
          {agent.model && (
            <span className="text-xs text-muted-light truncate">{agent.model}</span>
          )}
        </div>
      </div>

      {/* Inbox link status — o controle principal */}
      <div className="mx-4 mb-3 mt-1">
        {linkedInbox ? (
          <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-success">
                Atendendo: {linkedInbox.name ?? linkedInboxId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleUnlinkInbox}
              disabled={acting}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-danger/10 hover:text-danger transition-colors"
              title="Desvincular do canal"
            >
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
              <span className="hidden sm:inline">Desvincular</span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2">
            <p className="mb-1.5 text-xs text-muted">Sem canal vinculado</p>
            <div className="flex flex-wrap gap-1.5">
              {inboxes.map((inbox) => (
                <button
                  key={inbox.id}
                  type="button"
                  onClick={() => handleLinkInbox(inbox.id)}
                  disabled={acting}
                  className="flex items-center gap-1 rounded-md border border-[var(--module-accent)]/30 bg-[var(--module-accent)]/5 px-2 py-1 text-xs font-medium text-[var(--module-accent)] transition-all hover:bg-[var(--module-accent)]/15 disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3 w-3" />
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
        <div className="mx-4 mb-2 rounded px-2 py-1 text-xs text-danger bg-danger/5">
          {actionError}
        </div>
      )}

      {/* Footer com link para edição */}
      <div className="border-t border-border px-4 py-2.5">
        <Link
          href={`/whatsapp-intelligence/agentes/${agent.id}?companyId=${companyId}`}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-[var(--module-accent)] transition-colors"
        >
          <Settings className="h-3 w-3" />
          Configurar agente
          <ExternalLink className="ml-auto h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
