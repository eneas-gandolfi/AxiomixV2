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
  const [status, setStatus] = useState<{ active: boolean; expires_at: string | null } | null>(null);
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

  const timeLeft = status.expires_at
    ? Math.max(0, Math.floor((new Date(status.expires_at).getTime() - Date.now()) / 3600000))
    : null;

  if (status.active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" />
        Sessão ativa
        {timeLeft !== null && ` (${timeLeft}h)`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning">
      <XCircle className="h-3 w-3" />
      Sessão expirada
    </span>
  );
}
