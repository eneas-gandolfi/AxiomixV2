/**
 * Arquivo: src/components/layout/operator-nudges-bell.tsx
 * Propósito: Sino global no topbar mostrando nudges ("Avisar [Operador]")
 *            recebidas pelo usuário atual. Polling 30s, popover com lista,
 *            click em item marca como lido + abre conversa.
 *
 *            Distinto do TopbarNotifications (alerts sistêmicos por intenção
 *            de compra etc) — esse foca em interação gestor→atendente.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircleHeart, X } from "lucide-react";

const POLL_INTERVAL_MS = 30_000;

type Nudge = {
  id: string;
  company_id: string;
  conversation_id: string | null;
  from_user_id: string;
  customer_name: string | null;
  wait_seconds: number | null;
  created_at: string;
  read_at: string | null;
};

type NudgesResponse = {
  nudges?: Nudge[];
  unreadCount?: number;
  /** True quando o user já foi atendente em alguma conversa OU já recebeu
   *  nudge. Usado pra esconder o sino de gestores puros (que nunca recebem). */
  isOperator?: boolean;
  error?: string;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(diff / 1000));
  if (seconds < 60) return "agora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatWait(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h`;
}

export function OperatorNudgesBell() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  // null enquanto não temos resposta — esconde o sino até saber se o user
  // é operador. Evita "flash" do sino vazio pra gestores puros.
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchNudges = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/operator-nudges", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as NudgesResponse;
      setNudges(json.nudges ?? []);
      if (typeof json.isOperator === "boolean") {
        setIsOperator(json.isOperator);
      }
    } catch {
      // Falha silenciosa — sino não bloqueia operação.
    }
  }, []);

  // Polling
  useEffect(() => {
    void fetchNudges();
    const id = setInterval(() => void fetchNudges(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNudges]);

  // Tab title flash: prefixa "(N) " no document.title quando há nudges não-lidas.
  // Restaura o título original quando o popover é aberto OU lista zera.
  // Útil quando o operador tá em outra aba e quer perceber chegada de aviso.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    if (nudges.length > 0 && !isOpen) {
      document.title = `(${nudges.length}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [nudges.length, isOpen]);

  // Fecha popover ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const markAsRead = useCallback(
    async (nudgeId: string) => {
      // Otimista: remove da lista imediatamente
      setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
      try {
        await fetch(`/api/whatsapp/operator-nudges/${nudgeId}`, {
          method: "PATCH",
        });
      } catch {
        // Em falha, o próximo polling re-aparece (fonte da verdade no banco)
        void fetchNudges();
      }
    },
    [fetchNudges],
  );

  const markAllAsRead = useCallback(async () => {
    // Otimista: limpa lista localmente
    setNudges([]);
    try {
      await fetch("/api/whatsapp/operator-nudges", { method: "PATCH" });
    } catch {
      void fetchNudges();
    }
  }, [fetchNudges]);

  const unreadCount = nudges.length;

  // Esconde o sino quando o user nunca foi atendente nem recebeu nudge —
  // gestor puro não tem nada pra ver aqui. Também esconde no estado inicial
  // (isOperator === null) pra evitar flash antes do primeiro fetch.
  if (isOperator !== true) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        aria-label="Notificações de equipe"
        aria-expanded={isOpen}
      >
        <MessageCircleHeart size={16} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Avisos do gestor
            </p>
            <div className="flex items-center gap-2">
              {nudges.length > 1 ? (
                <button
                  onClick={() => void markAllAsRead()}
                  className="text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                >
                  Marcar todas
                </button>
              ) : null}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {nudges.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Sem avisos novos.
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                Quando o gestor clicar em &ldquo;Avisar&rdquo; no painel ao vivo,
                o aviso aparece aqui.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--color-border)] overflow-y-auto">
              {nudges.map((nudge) => (
                <li key={nudge.id}>
                  <Link
                    href={
                      nudge.conversation_id
                        ? `/whatsapp-intelligence/conversas/${nudge.conversation_id}`
                        : "#"
                    }
                    onClick={() => {
                      void markAsRead(nudge.id);
                      setIsOpen(false);
                    }}
                    className="flex flex-col gap-1 p-3 transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {nudge.customer_name ?? "Cliente sem nome"}
                      </p>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {formatRelative(nudge.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Gestor pediu pra você responder · esperando há{" "}
                      <span className="font-mono font-semibold text-[var(--color-text)]">
                        {formatWait(nudge.wait_seconds)}
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
