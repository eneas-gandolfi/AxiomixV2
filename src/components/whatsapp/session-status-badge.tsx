/**
 * Arquivo: src/components/whatsapp/session-status-badge.tsx
 * Propósito: Badge indicando status da janela de 24h do WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

type SessionStatusBadgeProps = {
  companyId: string;
  conversationExternalId: string;
};

export function SessionStatusBadge({ companyId, conversationExternalId }: SessionStatusBadgeProps) {
  const [status, setStatus] = useState<{ active: boolean; expires_at: string | null; seconds_remaining: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch("/api/whatsapp/session-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, conversationExternalId }),
        });
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch {
        // Silently fail — badge just won't show
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [companyId, conversationExternalId]);

  if (loading || !status) return null;

  const timeLeft = (() => {
    if (typeof status.seconds_remaining === "number" && status.seconds_remaining > 0) {
      const hours = Math.floor(status.seconds_remaining / 3600);
      const minutes = Math.floor((status.seconds_remaining % 3600) / 60);
      if (hours > 0) return `${hours}h${minutes > 0 ? `${minutes}min` : ""}`;
      return `${minutes}min`;
    }
    if (status.expires_at) {
      const hours = Math.max(0, Math.floor((new Date(status.expires_at).getTime() - Date.now()) / 3600000));
      return hours > 0 ? `${hours}h` : null;
    }
    return null;
  })();

  if (status.active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" />
        Sessão ativa
        {timeLeft && ` (${timeLeft})`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning">
      <XCircle className="h-3 w-3" />
      Sessão expirada — use template
    </span>
  );
}
