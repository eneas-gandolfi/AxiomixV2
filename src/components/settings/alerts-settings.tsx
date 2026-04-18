/**
 * Arquivo: src/components/settings/alerts-settings.tsx
 * Propósito: Configuração de alertas WhatsApp em tempo real.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  DollarSign,
  Download,
  Frown,
  XCircle,
  Flame,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  formatAlertErrorDetail,
  formatAlertRecipientPhone,
} from "@/lib/alerts/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type AlertPreference = {
  alertType: string;
  isEnabled: boolean;
  recipientPhone: string | null;
  cooldownMinutes: number;
  updatedAt: string | null;
};

type AlertLogEntry = {
  id: string;
  alertType: string;
  sourceId: string | null;
  recipientPhone: string;
  messagePreview: string | null;
  status: string;
  errorDetail: string | null;
  sentAt: string;
};

const ALERT_CONFIG = [
  {
    type: "purchase_intent",
    title: "Intenção de Compra",
    description: "Quando a IA detecta intenção de compra em uma conversa WhatsApp.",
    icon: DollarSign,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    type: "negative_sentiment",
    title: "Sentimento Negativo",
    description: "Quando uma conversa tem sentimento negativo e urgência alta (>= 4/5).",
    icon: Frown,
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
  {
    type: "failed_post",
    title: "Falha na Publicação",
    description: "Quando um post agendado falha parcial ou totalmente ao ser publicado.",
    icon: XCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    type: "viral_content",
    title: "Conteúdo Viral",
    description: "Quando o radar detecta conteúdo com alto score de engajamento (>= 300).",
    icon: Flame,
    color: "text-info",
    bgColor: "bg-info/10",
  },
] as const;

const COOLDOWN_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
];

const ALERT_TYPE_LABELS: Record<string, string> = {
  purchase_intent: "Intenção de Compra",
  negative_sentiment: "Sentimento Negativo",
  failed_post: "Falha na Publicação",
  viral_content: "Conteúdo Viral",
};

function escapeCsvField(value: string | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function exportAlertLogsToCsv(logs: AlertLogEntry[]): void {
  const headers = ["Data", "Tipo", "Telefone", "Status", "Mensagem", "Erro"];
  const rows = logs.map((log) => [
    new Date(log.sentAt).toISOString(),
    ALERT_TYPE_LABELS[log.alertType] ?? log.alertType,
    formatAlertRecipientPhone(log.recipientPhone),
    log.status,
    log.messagePreview ?? "",
    formatAlertErrorDetail(log.errorDetail) ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((field) => escapeCsvField(field)).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
  link.href = url;
  link.download = `alertas-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AlertsSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingType, setUpdatingType] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/alerts");
      if (!res.ok) return;
      const data = await res.json();
      setPreferences(data.preferences ?? []);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/alerts/log?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPreferences(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchPreferences, fetchLogs]);

  const updatePreference = async (
    alertType: string,
    updates: Partial<{ isEnabled: boolean; recipientPhone: string | null; cooldownMinutes: number }>
  ) => {
    const current = preferences.find((p) => p.alertType === alertType);
    setUpdatingType(alertType);

    try {
      const res = await fetch("/api/settings/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertType,
          isEnabled: updates.isEnabled ?? current?.isEnabled ?? false,
          recipientPhone: updates.recipientPhone !== undefined ? updates.recipientPhone : current?.recipientPhone,
          cooldownMinutes: updates.cooldownMinutes ?? current?.cooldownMinutes ?? 60,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Erro ao salvar",
          description: data.error ?? "Falha ao atualizar preferência.",
          variant: "destructive",
        });
        return;
      }

      const data = await res.json();
      setPreferences((prev) =>
        prev.map((p) =>
          p.alertType === alertType
            ? {
                alertType: data.preference.alertType,
                isEnabled: data.preference.isEnabled,
                recipientPhone: data.preference.recipientPhone,
                cooldownMinutes: data.preference.cooldownMinutes,
                updatedAt: data.preference.updatedAt,
              }
            : p
        )
      );

      toast({
        title: "Salvo",
        description: `Alerta "${ALERT_TYPE_LABELS[alertType]}" atualizado.`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor.",
        variant: "destructive",
      });
    } finally {
      setUpdatingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text">Alertas WhatsApp em Tempo Real</h2>
        <p className="mt-0.5 text-sm text-muted">
          Configure quais eventos disparam notificações no WhatsApp do gestor.
        </p>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4">
        {ALERT_CONFIG.map((config) => {
          const pref = preferences.find((p) => p.alertType === config.type);
          const isEnabled = pref?.isEnabled ?? false;
          const isUpdating = updatingType === config.type;
          const Icon = config.icon;

          return (
            <Card key={config.type} className="border border-border rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-text">{config.title}</h3>
                        <p className="text-xs text-muted mt-0.5">{config.description}</p>
                      </div>

                      {/* Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        disabled={isUpdating}
                        onClick={() => updatePreference(config.type, { isEnabled: !isEnabled })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                          isEnabled ? "bg-primary" : "bg-border"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Expanded settings when enabled */}
                    {isEnabled && (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                        {/* Phone */}
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-muted mb-1">
                            Telefone (opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Padrão: telefone do gestor"
                            value={pref?.recipientPhone ?? ""}
                            onChange={(e) => {
                              const value = e.target.value || null;
                              setPreferences((prev) =>
                                prev.map((p) =>
                                  p.alertType === config.type
                                    ? { ...p, recipientPhone: value }
                                    : p
                                )
                              );
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim() || null;
                              if (value !== (pref?.recipientPhone ?? null)) {
                                updatePreference(config.type, { recipientPhone: value });
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-text placeholder:text-muted-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Cooldown */}
                        <div className="sm:w-36">
                          <label className="block text-xs font-medium text-muted mb-1">
                            Cooldown
                          </label>
                          <select
                            value={pref?.cooldownMinutes ?? 60}
                            onChange={(e) =>
                              updatePreference(config.type, {
                                cooldownMinutes: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {COOLDOWN_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert History */}
      <Card className="border border-border rounded-xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-text flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted" />
              Histórico de Alertas
            </CardTitle>
            <CardDescription className="text-muted">
              Últimos alertas enviados para esta empresa.
            </CardDescription>
          </div>
          {logs.length > 0 ? (
            <button
              type="button"
              onClick={() => exportAlertLogsToCsv(logs)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted hover:text-text hover:border-border-strong transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          ) : null}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-light mb-2" />
              <p className="text-sm text-muted">Nenhum alerta enviado ainda.</p>
              <p className="text-xs text-muted-light mt-1">
                Ative os alertas acima para começar a receber notificações.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted">Data</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted">Tipo</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium text-muted">Telefone</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 text-xs text-muted whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-text">
                        {ALERT_TYPE_LABELS[log.alertType] ?? log.alertType}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted font-mono">
                        {formatAlertRecipientPhone(log.recipientPhone)}
                      </td>
                      <td className="py-2.5">
                        {log.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3 w-3" /> Enviado
                          </span>
                        ) : log.status === "failed" ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-danger"
                            title={formatAlertErrorDetail(log.errorDetail) ?? ""}
                          >
                            <AlertCircle className="h-3 w-3" /> Falhou
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Clock className="h-3 w-3" /> Ignorado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
