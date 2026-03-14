/**
 * Arquivo: src/components/whatsapp/sync-conversations-button.tsx
 * Proposito: Disparar sincronizacao manual de conversas no modulo WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncConversationsButtonProps = {
  companyId: string;
};

export function SyncConversationsButton({ companyId }: SyncConversationsButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/sofia-crm/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      const rawText = await response.text();
      let payload: {
        error?: string;
        result?: { syncedConversations?: number; syncedMessages?: number };
      } = {};

      if (rawText) {
        try {
          payload = JSON.parse(rawText) as typeof payload;
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        setError(payload.error ?? (rawText.slice(0, 180) || "Falha ao sincronizar conversas."));
        return;
      }

      const totalConversations = payload.result?.syncedConversations ?? 0;
      const totalMessages = payload.result?.syncedMessages ?? 0;
      setFeedback(`Sync concluido: ${totalConversations} conversas e ${totalMessages} mensagens.`);
      router.refresh();
    } catch (requestError) {
      const detail = requestError instanceof Error ? requestError.message : "Erro inesperado ao sincronizar.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" onClick={handleSync} disabled={isLoading}>
        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Sincronizando..." : "Sincronizar com Sofia CRM"}
      </Button>
      {feedback ? <p className="text-xs text-success">{feedback}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
