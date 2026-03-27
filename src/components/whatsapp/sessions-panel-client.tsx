/**
 * Arquivo: src/components/whatsapp/sessions-panel-client.tsx
 * Propósito: Painel consolidado de sessoes WhatsApp com alertas de expiracao.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Timer,
  Send,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ConversationSession = {
  conversationId: string;
  externalId: string;
  contactName: string | null;
  contactPhone: string | null;
  lastMessageAt: string | null;
  sessionActive: boolean;
  expiresAt: string | null;
  secondsRemaining: number | null;
};

type SessionSummary = {
  total: number;
  active: number;
  expiring: number;
  expired: number;
};

type SessionsPanelClientProps = {
  companyId: string;
};

function formatTimeLeft(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "Expirada";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function getSessionUrgency(session: ConversationSession): "critical" | "warning" | "ok" | "expired" {
  if (!session.sessionActive) return "expired";
  if (session.secondsRemaining !== null) {
    if (session.secondsRemaining <= 3600) return "critical"; // < 1h
    if (session.secondsRemaining <= 7200) return "warning";  // < 2h
  }
  return "ok";
}

const URGENCY_STYLES = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: AlertTriangle },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: Timer },
  ok: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: CheckCircle2 },
  expired: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", icon: XCircle },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">{label}</span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function SessionsPanelClient({ companyId }: SessionsPanelClientProps) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [summary, setSummary] = useState<SessionSummary>({ total: 0, active: 0, expiring: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expiring" | "expired">("all");
  const [templateTarget, setTemplateTarget] = useState<ConversationSession | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, limit: 50 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
        setSummary(data.summary ?? { total: 0, active: 0, expiring: 0, expired: 0 });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSendTemplate = useCallback(async () => {
    if (!templateTarget || !templateName.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          to: templateTarget.contactPhone,
          templateName: templateName.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, msg: `Template enviado para ${templateTarget.contactName ?? templateTarget.contactPhone}` });
        setTimeout(() => { setTemplateTarget(null); setSendResult(null); setTemplateName(""); }, 2000);
      } else {
        setSendResult({ ok: false, msg: data.error ?? "Erro ao enviar template." });
      }
    } catch {
      setSendResult({ ok: false, msg: "Erro de conexão." });
    } finally {
      setSending(false);
    }
  }, [companyId, templateTarget, templateName]);

  const filteredSessions = sessions.filter((s) => {
    if (filter === "expiring") {
      return s.sessionActive && s.secondsRemaining !== null && s.secondsRemaining <= 7200;
    }
    if (filter === "expired") return !s.sessionActive;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={summary.total}
          icon={MessageSquare}
          color="#8A8A8A"
          bgColor="bg-[var(--color-surface)]"
        />
        <StatCard
          label="Ativas"
          value={summary.active}
          icon={CheckCircle2}
          color="#52C41A"
          bgColor="bg-green-50/50"
        />
        <StatCard
          label="Expirando"
          value={summary.expiring}
          icon={AlertTriangle}
          color="#FA8C16"
          bgColor="bg-amber-50/50"
        />
        <StatCard
          label="Expiradas"
          value={summary.expired}
          icon={XCircle}
          color="#FF4D4F"
          bgColor="bg-red-50/50"
        />
      </div>

      {/* Alerta proativo */}
      {summary.expiring > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {summary.expiring} conversa{summary.expiring !== 1 ? "s" : ""} perdem a sessão nas próximas 2 horas
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              Envie uma mensagem ou template antes que expire para evitar custos adicionais.
            </p>
          </div>
        </div>
      )}

      {/* Filters + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "expiring", "expired"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[#2EC4B6] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
              }`}
            >
              {f === "all" ? "Todas" : f === "expiring" ? "Expirando" : "Expiradas"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Session list */}
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#2EC4B6]" />
            <span className="text-base font-semibold text-text">
              Sessões WhatsApp
              <span className="ml-2 text-sm font-normal text-muted">({filteredSessions.length})</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Nenhuma sessão encontrada.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSessions.map((session) => {
                const urgency = getSessionUrgency(session);
                const styles = URGENCY_STYLES[urgency];
                const Icon = styles.icon;

                return (
                  <div key={session.conversationId} className="flex items-center gap-4 px-4 py-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.bg}`}>
                      <Icon className={`h-4 w-4 ${styles.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {session.contactName ?? "Sem nome"}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {session.contactPhone}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!session.sessionActive && session.contactPhone && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTemplateTarget(session); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2EC4B6] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#27b0a3] transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          Template
                        </button>
                      )}
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text} border ${styles.border}`}
                        >
                          {session.sessionActive
                            ? formatTimeLeft(session.secondsRemaining)
                            : "Expirada"}
                        </span>
                        {session.lastMessageAt && (
                          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                            Última msg:{" "}
                            {new Date(session.lastMessageAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Envio de Template */}
      {templateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--color-text)]">Enviar Template</h3>
              <button
                type="button"
                onClick={() => { setTemplateTarget(null); setSendResult(null); setTemplateName(""); }}
                className="rounded-lg p-1 hover:bg-[var(--color-surface-2)] transition-colors"
              >
                <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              Para: <span className="font-medium text-[var(--color-text)]">{templateTarget.contactName ?? templateTarget.contactPhone}</span>
              <br />
              <span className="text-xs">{templateTarget.contactPhone}</span>
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Nome do Template
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: hello_world"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[#2EC4B6] focus:outline-none focus:ring-1 focus:ring-[#2EC4B6]"
              />
            </div>

            {sendResult && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${sendResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {sendResult.msg}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setTemplateTarget(null); setSendResult(null); setTemplateName(""); }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendTemplate}
                disabled={sending || !templateName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2EC4B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#27b0a3] transition-colors disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
