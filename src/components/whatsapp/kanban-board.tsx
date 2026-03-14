/**
 * Arquivo: src/components/whatsapp/kanban-board.tsx
 * Propósito: Board visual Kanban com colunas (stages) e cards.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState } from "react";
import { Plus, GripVertical, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type KanbanCard = {
  id: string;
  title: string | null;
  description: string | null;
  stage_id: string | null;
  source: string | null;
  created_at: string | null;
};

type KanbanStage = {
  id: string;
  name: string | null;
  position: number | null;
  cards: KanbanCard[] | null;
};

type KanbanBoardProps = {
  boardId: string;
  boardName: string | null;
  stages: KanbanStage[];
  companyId: string;
  onRefresh: () => void;
};

const STAGE_COLORS = [
  "border-t-blue-400",
  "border-t-amber-400",
  "border-t-green-400",
  "border-t-purple-400",
  "border-t-rose-400",
  "border-t-cyan-400",
  "border-t-orange-400",
];

export function KanbanBoard({ boardId, boardName, stages, companyId, onRefresh }: KanbanBoardProps) {
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [creatingInStage, setCreatingInStage] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");

  const handleMoveCard = async (cardId: string, targetStageId: string) => {
    setMovingCardId(cardId);
    try {
      await fetch("/api/whatsapp/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "move",
          cardId,
          boardId,
          stageId: targetStageId,
        }),
      });
      onRefresh();
    } catch {
      // Silently fail
    } finally {
      setMovingCardId(null);
    }
  };

  const handleCreateCard = async (stageId: string) => {
    if (!newCardTitle.trim()) return;
    try {
      await fetch("/api/whatsapp/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "create",
          boardId,
          title: newCardTitle.trim(),
          description: newCardDesc.trim() || undefined,
          stage_id: stageId,
        }),
      });
      setCreatingInStage(null);
      setNewCardTitle("");
      setNewCardDesc("");
      onRefresh();
    } catch {
      // Silently fail
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await fetch("/api/whatsapp/kanban/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "delete", cardId }),
      });
      onRefresh();
    } catch {
      // Silently fail
    }
  };

  const sortedStages = [...stages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">{boardName ?? "Pipeline"}</h2>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStages.map((stage, index) => {
          const cards = stage.cards ?? [];
          const colorClass = STAGE_COLORS[index % STAGE_COLORS.length];

          return (
            <div
              key={stage.id}
              className={`w-72 shrink-0 rounded-xl border border-border bg-sidebar border-t-4 ${colorClass}`}
            >
              {/* Stage header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{stage.name ?? "Sem nome"}</span>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                    {cards.length}
                  </span>
                </div>
                <button
                  onClick={() => setCreatingInStage(stage.id)}
                  className="rounded p-1 text-muted hover:text-text transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="space-y-2 p-2 min-h-[100px]">
                {/* Create card form */}
                {creatingInStage === stage.id && (
                  <div className="rounded-lg border border-[#2EC4B6] bg-card p-2 space-y-2">
                    <input
                      type="text"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Título do card"
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text placeholder:text-muted focus:outline-none"
                      autoFocus
                    />
                    <textarea
                      value={newCardDesc}
                      onChange={(e) => setNewCardDesc(e.target.value)}
                      placeholder="Descrição (opcional)"
                      rows={2}
                      className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleCreateCard(stage.id)} disabled={!newCardTitle.trim()}>
                        Criar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setCreatingInStage(null); setNewCardTitle(""); setNewCardDesc(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {cards.map((card) => (
                  <Card
                    key={card.id}
                    className={`rounded-lg border border-border bg-card transition-all hover:border-border-strong ${
                      movingCardId === card.id ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text truncate">
                            {card.title ?? "Sem título"}
                          </p>
                          {card.description && (
                            <p className="mt-1 text-xs text-muted line-clamp-2">
                              {card.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {card.source && (
                              <span className="rounded bg-[#E0FAF7] px-1.5 py-0.5 text-xs text-[#2EC4B6]">
                                {card.source}
                              </span>
                            )}
                            {card.created_at && (
                              <span className="text-xs text-muted-light">
                                {new Date(card.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="shrink-0 rounded p-1 text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Move buttons */}
                      {sortedStages.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {sortedStages
                            .filter((s) => s.id !== stage.id)
                            .map((targetStage) => (
                              <button
                                key={targetStage.id}
                                onClick={() => handleMoveCard(card.id, targetStage.id)}
                                disabled={movingCardId === card.id}
                                className="rounded bg-background px-1.5 py-0.5 text-xs text-muted hover:bg-sidebar hover:text-text transition-colors"
                              >
                                → {targetStage.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {cards.length === 0 && creatingInStage !== stage.id && (
                  <p className="py-4 text-center text-xs text-muted-light">Sem cards</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
