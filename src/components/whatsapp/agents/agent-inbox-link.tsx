/**
 * Componente para vincular/desvincular agente IA ao inbox WhatsApp.
 * Mostra status atual e botão de ação.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, MessageCircle, Power, PowerOff, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

type Integration = {
  id: string;
  provider: string;
  config: Record<string, unknown>;
};

type Inbox = {
  id: string;
  name: string | null;
  channel_type: string | null;
  provider: string | null;
};

type AgentInboxLinkProps = {
  companyId: string;
  agentId: string;
};

export function AgentInboxLink({ companyId, agentId }: AgentInboxLinkProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inboxIntegration = integrations.find((i) => i.provider === "crm_inbox");
  const linkedInboxId = inboxIntegration
    ? String(inboxIntegration.config.inbox_id ?? "")
    : null;
  const linkedInbox = linkedInboxId
    ? inboxes.find((i) => i.id === linkedInboxId)
    : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, inboxRes] = await Promise.all([
        fetch(`/api/whatsapp/agents/${agentId}/inbox?companyId=${companyId}`),
        fetch("/api/whatsapp/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, action: "listInboxes" }),
        }),
      ]);

      if (intRes.ok) {
        const data = await intRes.json();
        setIntegrations(data.integrations ?? []);
      }
      if (inboxRes.ok) {
        const data = await inboxRes.json();
        setInboxes(data.inboxes ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [companyId, agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLink = async (inboxId: string) => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/agents/${agentId}/inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, inboxId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao vincular.");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular.");
    } finally {
      setActing(false);
    }
  };

  const handleUnlink = async () => {
    if (!inboxIntegration) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/agents/${agentId}/inbox`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, integrationId: inboxIntegration.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao desvincular.");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desvincular.");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando vinculação...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text">Canal WhatsApp</h3>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {linkedInbox ? (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
              <MessageCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">
                Vinculado: {linkedInbox.name ?? linkedInboxId}
              </p>
              <p className="text-xs text-muted">
                {linkedInbox.channel_type ?? "WhatsApp"} · {linkedInbox.provider ?? ""}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUnlink}
            disabled={acting}
            className="gap-1.5 text-xs"
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
            Desvincular
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Vincule este agente a um canal para que ele atenda conversas automaticamente.
          </p>
          {inboxes.length === 0 ? (
            <p className="text-xs text-muted">Nenhum inbox disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {inboxes.map((inbox) => (
                <Button
                  key={inbox.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleLink(inbox.id)}
                  disabled={acting}
                  className="gap-1.5 text-xs"
                >
                  {acting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                  {inbox.name ?? inbox.id}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
