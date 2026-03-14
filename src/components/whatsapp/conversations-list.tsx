/**
 * Arquivo: src/components/whatsapp/conversations-list.tsx
 * Proposito: Lista de conversas com filtros aplicados (client-side).
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConversationFiltersCompact, type ConversationFilters } from "./conversation-filters-compact";
import { ConversationsTable } from "./conversations-table";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversationData = {
  id: string;
  external_id: string | null;
  contact_name: string | null;
  remote_jid: string;
  status: string | null;
  last_message_at: string | null;
  sentiment: Sentiment | null;
  intent: string | null;
};

type ConversationsListProps = {
  conversations: ConversationData[];
  companyId: string;
};

export function ConversationsList({ conversations, companyId }: ConversationsListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ConversationFilters>({
    sentiment: "all",
    intent: "all",
    status: "all",
    period: "7",
    search: "",
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    try {
      let successCount = 0;
      let failCount = 0;

      for (const conversationId of Array.from(selectedIds)) {
        try {
          const response = await fetch("/api/whatsapp/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, conversationId }),
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

      setFeedback(
        `Análise concluída: ${successCount} sucesso(s), ${failCount} falha(s).`
      );
      setSelectedIds(new Set());
      setSelectionMode(false);

      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Erro ao analisar conversas.";
      setError(detail);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

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
  }, [conversations, filters]);

  return (
    <>
      <ConversationFiltersCompact onFiltersChange={setFilters} />

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
                    variant="default"
                    size="sm"
                    onClick={handleAnalyzeSelected}
                    disabled={isAnalyzing || selectedIds.size === 0}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isAnalyzing
                      ? "Analisando..."
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
