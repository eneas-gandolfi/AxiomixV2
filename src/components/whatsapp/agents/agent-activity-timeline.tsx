/**
 * Timeline de eventos do agente IA — paginação por cursor (created_at).
 * Renderiza ícone por event_type + descrição humana + timestamp relativo.
 *
 * Eventos suportados: activated, deactivated, config_updated, inbox_linked,
 * inbox_unlinked, message_handled, error, created, deleted.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Link2,
  Link2Off,
  Loader2,
  MessageSquare,
  Power,
  PowerOff,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

type ActivityEvent = {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
};

type AgentActivityTimelineProps = {
  agentId: string;
  companyId: string;
};

const PAGE_SIZE = 50;

export function AgentActivityTimeline({ agentId, companyId }: AgentActivityTimelineProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          companyId,
          limit: String(PAGE_SIZE),
        });
        if (!reset && cursor) params.set("cursor", cursor);
        if (typeFilter) params.set("type", typeFilter);

        const res = await fetch(
          `/api/whatsapp/agents/${agentId}/activity?${params.toString()}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Falha ao carregar atividade.");
        }
        const data: { events: ActivityEvent[]; next_cursor: string | null } = await res.json();
        setEvents((prev) => (reset ? data.events : [...prev, ...data.events]));
        setCursor(data.next_cursor);
        setHasMore(Boolean(data.next_cursor));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      } finally {
        setLoading(false);
      }
    },
    [agentId, companyId, cursor, typeFilter]
  );

  useEffect(() => {
    setEvents([]);
    setCursor(null);
    setHasMore(false);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, companyId, typeFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">Atividade recente</h3>
        <select
          value={typeFilter ?? ""}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs text-text"
        >
          <option value="">Todos os eventos</option>
          <option value="activated,deactivated">Ativação</option>
          <option value="config_updated">Edição</option>
          <option value="inbox_linked,inbox_unlinked">Canal</option>
          <option value="message_handled">Mensagens</option>
          <option value="error">Erros</option>
        </select>
      </div>

      {events.length === 0 && !loading && !error && (
        <div className="rounded-lg border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted">
          Nenhuma atividade registrada ainda.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div className="mt-0.5 shrink-0 text-muted">{iconFor(event.event_type)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text">{describe(event)}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {formatRelative(event.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted" />
        </div>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={() => fetchPage(false)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted transition-colors hover:bg-muted/10"
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}

function iconFor(type: string) {
  switch (type) {
    case "activated":
      return <Power className="h-4 w-4 text-success" />;
    case "deactivated":
      return <PowerOff className="h-4 w-4 text-muted" />;
    case "config_updated":
      return <Settings className="h-4 w-4 text-[var(--module-accent)]" />;
    case "inbox_linked":
      return <Link2 className="h-4 w-4 text-success" />;
    case "inbox_unlinked":
      return <Link2Off className="h-4 w-4 text-muted" />;
    case "message_handled":
      return <MessageSquare className="h-4 w-4 text-[var(--module-accent)]" />;
    case "error":
      return <AlertTriangle className="h-4 w-4 text-danger" />;
    case "created":
      return <Sparkles className="h-4 w-4 text-success" />;
    case "deleted":
      return <Trash2 className="h-4 w-4 text-danger" />;
    default:
      return <Settings className="h-4 w-4 text-muted" />;
  }
}

function describe(event: ActivityEvent): string {
  const { event_type: type, details } = event;
  switch (type) {
    case "activated":
      return "Agente ativado";
    case "deactivated":
      return "Agente desativado";
    case "config_updated": {
      const changed = Array.isArray(details.changed) ? (details.changed as string[]) : [];
      const list = changed.length > 0 ? changed.join(", ") : "configuração";
      return `Configuração atualizada — ${list}`;
    }
    case "inbox_linked":
      return `Canal vinculado${details.inbox_id ? ` (inbox ${details.inbox_id})` : ""}`;
    case "inbox_unlinked":
      return "Canal desvinculado";
    case "message_handled":
      return `Mensagem atendida${
        details.conversation_id ? ` na conversa ${String(details.conversation_id).slice(0, 8)}…` : ""
      }`;
    case "error": {
      const op = typeof details.operation === "string" ? details.operation : "operação";
      const msg = typeof details.message === "string" ? details.message : "";
      return `Erro em ${op}${msg ? `: ${truncate(msg, 80)}` : ""}`;
    }
    case "created":
      return "Agente criado";
    case "deleted":
      return "Agente excluído";
    default:
      return type;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "agora há pouco";
  const min = Math.round(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `há ${hr} h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `há ${day} d`;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
