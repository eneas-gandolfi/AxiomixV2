"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  formatAlertErrorDetail,
  formatAlertMessagePreview,
  formatAlertRecipientPhone,
} from "@/lib/alerts/format";
import { cn } from "@/lib/utils";

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

type CriticalCountResponse = {
  count?: number;
};

type AlertLogsResponse = {
  logs?: AlertLogEntry[];
};

const ALERT_LABELS: Record<string, string> = {
  purchase_intent: "Intenção de compra",
  negative_sentiment: "Sentimento negativo",
  failed_post: "Falha na publicação",
  viral_content: "Conteúdo viral",
};

const NOTIFICATIONS_PANEL_ID = "topbar-notifications-panel";

function getAlertLabel(alertType: string) {
  return ALERT_LABELS[alertType] ?? "Alerta";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "sent":
      return "Enviado com sucesso";
    case "failed":
      return "Falha no envio";
    default:
      return "Ignorado pelo cooldown";
  }
}

function getStatusTone(status: string) {
  switch (status) {
    case "sent":
      return {
        dot: "bg-success",
        text: "text-success",
        Icon: CheckCircle2,
      };
    case "failed":
      return {
        dot: "bg-danger",
        text: "text-danger",
        Icon: XCircle,
      };
    default:
      return {
        dot: "bg-warning",
        text: "text-warning",
        Icon: Clock3,
      };
  }
}

function formatTimestamp(sentAt: string) {
  return new Date(sentAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

export function TopbarNotifications() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [criticalCount, setCriticalCount] = useState(0);
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [countResult, logsResult] = await Promise.allSettled([
      fetch("/api/whatsapp/critical-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      }),
      fetch("/api/settings/alerts/log?limit=5", {
        cache: "no-store",
      }),
    ]);

    let loadedAnyResource = false;

    if (countResult.status === "fulfilled" && countResult.value.ok) {
      const countData = (await countResult.value.json()) as CriticalCountResponse;
      setCriticalCount(countData.count ?? 0);
      loadedAnyResource = true;
    }

    if (logsResult.status === "fulfilled" && logsResult.value.ok) {
      const logsData = (await logsResult.value.json()) as AlertLogsResponse;
      setLogs(logsData.logs ?? []);
      loadedAnyResource = true;
    }

    if (!loadedAnyResource) {
      setError("Não foi possível carregar as notificações.");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshNotifications();

    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 120000);

    return () => window.clearInterval(interval);
  }, [refreshNotifications]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((current) => {
      const next = !current;

      if (next) {
        void refreshNotifications();
      }

      return next;
    });
  };

  const badgeLabel = criticalCount > 99 ? "99+" : String(criticalCount);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={NOTIFICATIONS_PANEL_ID}
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      >
        <Bell size={18} aria-hidden="true" />
        {criticalCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          id={NOTIFICATIONS_PANEL_ID}
          role="dialog"
          aria-label="Painel de notificações"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-modal"
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Notificações
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Alertas críticos e entregas recentes.
                </p>
              </div>
              {isLoading ? (
                <Loader2
                  className="mt-0.5 h-4 w-4 animate-spin text-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-4 p-4">
            <Link
              href="/whatsapp-intelligence"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3 transition-colors",
                criticalCount > 0
                  ? "border-danger/20 bg-danger-light"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  criticalCount > 0
                    ? "bg-danger/10 text-danger"
                    : "bg-primary-light text-primary"
                )}
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {criticalCount > 0
                    ? `${badgeLabel} conversa${criticalCount === 1 ? "" : "s"} crítica${criticalCount === 1 ? "" : "s"} nas últimas 24h`
                    : "Nenhuma conversa crítica agora"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {criticalCount > 0
                    ? "Abra o módulo de WhatsApp e priorize os atendimentos mais sensíveis."
                    : "O módulo de WhatsApp segue sem alertas críticos no momento."}
                </p>
              </div>
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
                aria-hidden="true"
              />
            </Link>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
                  Últimos alertas
                </p>
                <Link
                  href="/settings?tab=alerts"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-[var(--color-primary)] transition-opacity hover:opacity-80"
                >
                  Ver tudo
                </Link>
              </div>

              {error ? (
                <div className="rounded-2xl border border-danger/20 bg-danger-light p-3">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    Erro ao carregar
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {error}
                  </p>
                </div>
              ) : null}

              {!error && isLoading && logs.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-8">
                  <Loader2
                    className="h-5 w-5 animate-spin text-[var(--color-text-secondary)]"
                    aria-hidden="true"
                  />
                </div>
              ) : null}

              {!error && !isLoading && logs.length === 0 ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <Bell className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        Nenhum alerta enviado ainda
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Ative os alertas no menu de configurações para acompanhar eventos aqui.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {logs.length > 0 ? (
                <ul className="space-y-2">
                  {logs.map((log) => {
                    const tone = getStatusTone(log.status);
                    const StatusIcon = tone.Icon;

                    return (
                      <li
                        key={log.id}
                        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                              tone.dot
                            )}
                            aria-hidden="true"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium text-[var(--color-text)]">
                                {getAlertLabel(log.alertType)}
                              </p>
                              <span className="shrink-0 text-[11px] text-[var(--color-text-secondary)]">
                                {formatTimestamp(log.sentAt)}
                              </span>
                            </div>

                            <div
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 text-xs",
                                tone.text
                              )}
                            >
                              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              {getStatusLabel(log.status)}
                            </div>

                            <p className="mt-2 text-[11px] font-mono text-[var(--color-text-secondary)]">
                              Destino: {formatAlertRecipientPhone(log.recipientPhone)}
                            </p>

                            {formatAlertMessagePreview(log.messagePreview) ? (
                              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                                {truncateText(formatAlertMessagePreview(log.messagePreview) ?? "", 110)}
                              </p>
                            ) : null}

                            {log.status === "failed" && formatAlertErrorDetail(log.errorDetail) ? (
                              <p className="mt-2 text-xs leading-5 text-danger">
                                {truncateText(formatAlertErrorDetail(log.errorDetail) ?? "", 110)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
