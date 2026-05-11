/**
 * Arquivo: src/components/settings/notifications-settings.tsx
 * Propósito: Aba Notificações — apenas alertas em tempo real (WhatsApp).
 *            A sub-aba de relatórios periódicos foi removida com a feature.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

"use client";

import { Info } from "lucide-react";
import { AlertsSettings } from "@/components/settings/alerts-settings";

export function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Notificações</h2>
        <p className="mt-0.5 text-sm text-muted">
          Mensagens enviadas ao gestor via WhatsApp, independente do agente de IA do Evo CRM.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-primary-light/20 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted">
            <span className="font-medium text-text">Diferença do agente do CRM:</span>{" "}
            esses avisos são enviados para o gestor. O agente do Evo CRM atua dentro das conversas
            com o cliente.
          </p>
        </div>
      </div>

      <AlertsSettings />
    </div>
  );
}
