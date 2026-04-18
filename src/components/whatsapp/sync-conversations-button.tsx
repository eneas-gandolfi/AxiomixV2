/**
 * Arquivo: src/components/whatsapp/sync-conversations-button.tsx
 * Propósito: Disparar sincronização manual de conversas no módulo WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestEvoSync,
  useEvoSyncStatus,
  type EvoSyncResponse,
} from "@/components/whatsapp/evo-sync-client";

type SyncConversationsButtonProps = {
  companyId: string;
};

export function SyncConversationsButton({ companyId }: SyncConversationsButtonProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { syncing, activeMode, progress } = useEvoSyncStatus(companyId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFullSyncing = syncing && activeMode !== "messages_only";
  const isAutoRefreshing = syncing && activeMode === "messages_only";

  const formatFeedback = (payload: EvoSyncResponse) => {
    const totalConversations = payload.result?.syncedConversations ?? 0;
    const totalMessages = payload.result?.syncedMessages ?? 0;
    const processedAnalyses = payload.analysis?.processedAnalyses ?? 0;
    const failedAnalyses = payload.analysis?.failedAnalyses ?? 0;
    const analysisSummary =
      processedAnalyses > 0 || failedAnalyses > 0
        ? ` ${processedAnalyses} análise(s) concluída(s), ${failedAnalyses} falha(s).`
        : "";

    return `Sync concluído: ${totalConversations} conversas e ${totalMessages} mensagens.${analysisSummary}`;
  };

  const handleSync = async () => {
    setFeedback(null);
    setError(null);

    try {
      const payload = await requestEvoSync({ companyId });
      const summary = formatFeedback(payload);
      setFeedback(summary);
      message.success(summary);
      router.refresh();
    } catch (requestError) {
      const detail = requestError instanceof Error ? requestError.message : "Erro inesperado ao sincronizar.";
      setError(detail);
      message.error(detail);
    }
  };

  const progressLabel = (() => {
    if (!isFullSyncing) {
      return "Sincronizar com Evo CRM";
    }
    if (!progress) {
      return "Sincronizando...";
    }
    const { processedConversations, totalConversations, syncedMessages, phase } = progress;
    if (phase === "conversations") {
      return `Carregando conversas... (${totalConversations})`;
    }
    if (phase === "upserting") {
      const pct = totalConversations > 0 ? Math.round((processedConversations / totalConversations) * 100) : 0;
      return `Salvando conversas... ${processedConversations}/${totalConversations} (${pct}%)`;
    }
    const pct = totalConversations > 0 ? Math.round((processedConversations / totalConversations) * 100) : 0;
    return `Sincronizando... ${processedConversations}/${totalConversations} conversas (${pct}%) — ${syncedMessages} msgs`;
  })();

  const progressPct =
    isFullSyncing && progress && progress.totalConversations > 0 && progress.phase !== "conversations"
      ? Math.round((progress.processedConversations / progress.totalConversations) * 100)
      : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        title={isAutoRefreshing ? "Atualização automática de mensagens em andamento." : undefined}
      >
        <RefreshCw className={`h-4 w-4 ${isFullSyncing ? "animate-spin" : ""}`} />
        {progressLabel}
      </Button>
      {isAutoRefreshing ? (
        <p className="text-xs text-muted">Atualização automática de mensagens em andamento.</p>
      ) : null}
      {isFullSyncing && progressPct !== null ? (
        <div className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-[#2EC4B6] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}
      {feedback ? <p className="text-xs text-success">{feedback}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
