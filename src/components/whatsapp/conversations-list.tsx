/**
 * Arquivo: src/components/whatsapp/conversations-list.tsx
 * Propósito: Lista de conversas com filtros aplicados (client-side).
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, Sparkles, Trash2 } from "lucide-react";
import { App, Progress } from "antd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationFiltersCompact, type ConversationFilters } from "./conversation-filters-compact";
import { ConversationsTable } from "./conversations-table";
import { ExportButton } from "./export-button";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversationData = {
  id: string;
  external_id: string | null;
  contact_name: string | null;
  contact_avatar_url: string | null;
  remote_jid: string;
  status: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
  sentiment: Sentiment | null;
  intent: string | null;
};

type ConversationsListProps = {
  conversations: ConversationData[];
  companyId: string;
  agents?: Array<{ id: string; name: string | null }>;
};

export function ConversationsList({ conversations, companyId, agents = [] }: ConversationsListProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [filters, setFilters] = useState<ConversationFilters>({
    sentiment: "all",
    intent: "all",
    status: "all",
    agent: "all",
    period: "7",
    search: "",
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null);

  const handleToggleSelection = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedIds.size === 0) {
      setError("Selecione pelo menos uma conversa para analisar.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setFeedback(null);

    const analyzedIds = Array.from(selectedIds);

    try {
      let successCount = 0;
      let failCount = 0;
      const total = analyzedIds.length;
      setAnalyzeProgress({ current: 0, total });

      for (let i = 0; i < analyzedIds.length; i++) {
        setAnalyzeProgress({ current: i + 1, total });
        try {
          const response = await fetch("/api/whatsapp/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, conversationId: analyzedIds[i] }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        // Toast de sucesso antes de navegar
        message.success(`${successCount} conversa(s) analisada(s) com sucesso.`);
        const batchUrl = `/whatsapp-intelligence/conversas/analise-lote?ids=${analyzedIds.join(",")}`;
        setSelectedIds(new Set());
        setSelectionMode(false);
        await new Promise((r) => setTimeout(r, 1200));
        router.push(batchUrl);
      } else {
        // Todas falharam — manter na mesma página com feedback de erro
        setError(`Todas as ${failCount} análise(s) falharam.`);
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erro ao analisar conversas.";
      setError(detail);
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(null);
    }
  };

  const handleViewAnalyses = () => {
    const ids = Array.from(selectedIds);
    const batchUrl = `/whatsapp-intelligence/conversas/analise-lote?ids=${ids.join(",")}`;
    router.push(batchUrl);
  };

  const selectedWithInsight = useMemo(() => {
    if (!selectionMode || selectedIds.size === 0) return 0;
    return conversations.filter(
      (c) => selectedIds.has(c.id) && c.sentiment !== null
    ).length;
  }, [selectionMode, selectedIds, conversations]);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      setError("Selecione pelo menos uma conversa para excluir.");
      return;
    }

    const confirmed = window.confirm(
      `Excluir ${selectedIds.size} conversa(s) do Axiomix? Elas não serão removidas do Sofia CRM e não voltarão nas próximas sincronizações.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setFeedback(null);

    try {
      const ids = Array.from(selectedIds);
      const response = await fetch("/api/whatsapp/conversations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, conversationIds: ids }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        deletedCount?: number;
      };

      if (!response.ok) {
        setError(payload.error ?? "Falha ao excluir conversas.");
        return;
      }

      setDeletedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          next.add(id);
        }
        return next;
      });
      setFeedback(payload.message ?? `${payload.deletedCount ?? ids.length} conversa(s) excluída(s).`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      router.refresh();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erro ao excluir conversas.";
      setError(detail);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations.filter((conversation) => !deletedIds.has(conversation.id));

    // Filtro de sentimento
    if (filters.sentiment === "not_analyzed") {
      filtered = filtered.filter((conv) => conv.sentiment === null);
    } else if (filters.sentiment !== "all") {
      filtered = filtered.filter((conv) => conv.sentiment === filters.sentiment);
    }

    // Filtro de intenção
    if (filters.intent !== "all") {
      filtered = filtered.filter((conv) => conv.intent === filters.intent);
    }

    // Filtro de status
    if (filters.status !== "all") {
      filtered = filtered.filter((conv) => conv.status === filters.status);
    }

    // Filtro de agente
    if (filters.agent !== "all") {
      filtered = filtered.filter((conv) => conv.assigned_to === filters.agent);
    }

    // Filtro de período
    if (filters.period !== "all") {
      const daysAgo = parseInt(filters.period, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      filtered = filtered.filter((conv) => {
        if (!conv.last_message_at) {
          return false;
        }
        return new Date(conv.last_message_at) >= cutoffDate;
      });
    }

    // Filtro de busca
    if (filters.search.trim() !== "") {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter((conv) => {
        const name = (conv.contact_name ?? "").toLowerCase();
        const phone = conv.remote_jid.toLowerCase();
        return name.includes(searchLower) || phone.includes(searchLower);
      });
    }

    return filtered;
  }, [conversations, deletedIds, filters]);

  const exportConversationIds = useMemo(() => {
    if (selectedIds.size > 0) {
      return Array.from(selectedIds);
    }

    return filteredConversations.map((conversation) => conversation.id);
  }, [filteredConversations, selectedIds]);

  return (
    <>
      <ConversationFiltersCompact onFiltersChange={setFilters} agents={agents} />

      {feedback && <p className="mb-2 text-sm text-success">{feedback}</p>}
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-text">
              Conversas recentes
              {filteredConversations.length !== conversations.length && (
                <span className="ml-2 text-sm font-normal text-muted">
                  ({filteredConversations.length} de {conversations.length})
                </span>
              )}
              {selectionMode && selectedIds.size > 0 && (
                <span className="ml-2 text-sm font-semibold text-primary">
                  {selectedIds.size} selecionada(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <ExportButton
                companyId={companyId}
                conversationIds={exportConversationIds}
                disabled={exportConversationIds.length === 0}
              />
              {!selectionMode ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  Selecionar
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedIds.size === filteredConversations.length
                      ? "Desmarcar todas"
                      : "Selecionar todas"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting || isAnalyzing || selectedIds.size === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeleting ? "Excluindo..." : `Excluir (${selectedIds.size})`}
                  </Button>
                  {selectedWithInsight > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleViewAnalyses}
                      disabled={isAnalyzing || isDeleting}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver análises
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleAnalyzeSelected}
                    disabled={isAnalyzing || isDeleting || selectedIds.size === 0}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isAnalyzing
                      ? `Analisando ${analyzeProgress ? `${analyzeProgress.current}/${analyzeProgress.total}` : ""}...`
                      : `Analisar (${selectedIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        {isAnalyzing && analyzeProgress && (
          <div className="antd-scope px-4 pb-2">
            <Progress
              percent={Math.round((analyzeProgress.current / analyzeProgress.total) * 100)}
              size="small"
              strokeColor="var(--color-primary)"
              status={analyzeProgress.current === analyzeProgress.total ? "success" : "active"}
            />
          </div>
        )}
        <CardContent className="p-0">
          <div className="antd-scope">
            <ConversationsTable
              conversations={filteredConversations}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
