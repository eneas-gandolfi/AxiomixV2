/**
 * Arquivo: src/components/whatsapp/kanban-board.tsx
 * Propósito: Board visual Kanban com drag-and-drop, métricas e drawer de detalhes.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCardItem } from "./kanban-card-item";
import { KanbanCardDrawer } from "./kanban-card-drawer";
import type { RichKanbanCard, KanbanStage, TeamMember } from "./kanban-types";

type KanbanBoardProps = {
  boardId: string;
  boardName: string | null;
  stages: KanbanStage[];
  companyId: string;
  teamMembers: TeamMember[];
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

function formatStageCurrency(total: number) {
  return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StageColumn({
  stage,
  colorClass,
  isOver,
  children,
}: {
  stage: KanbanStage;
  colorClass: string;
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
    data: { type: "stage", stageId: stage.id },
  });

  const cards = stage.cards ?? [];
  const stageTotal = cards.reduce((sum, c) => sum + (c.value_amount ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 rounded-xl border border-border bg-sidebar border-t-4 sm:w-72 ${colorClass} transition-colors ${
        isOver ? "bg-[#E0FAF7]/30" : ""
      }`}
    >
      {/* Stage header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">{stage.name ?? "Sem nome"}</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
              {cards.length}
            </span>
          </div>
          {stageTotal > 0 && (
            <span className="text-xs font-medium text-[#2EC4B6]">
              {formatStageCurrency(stageTotal)}
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2 p-2 min-h-[100px]">
        {children}
        {cards.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-light">Sem cards</p>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  boardId,
  boardName,
  stages,
  companyId,
  teamMembers,
  onRefresh,
}: KanbanBoardProps) {
  // DnD state
  const [activeCard, setActiveCard] = useState<RichKanbanCard | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  // Local board state for optimistic updates
  const [localStages, setLocalStages] = useState<KanbanStage[]>(stages);

  // Card creation
  const [creatingInStage, setCreatingInStage] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [newCardValue, setNewCardValue] = useState("");
  const [newCardPriority, setNewCardPriority] = useState("");
  const [newCardAssignee, setNewCardAssignee] = useState("");
  const [newCardPhone, setNewCardPhone] = useState("");

  // Drawer
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Sync external stages with local state
  const stagesKey = stages.map((s) => `${s.id}:${(s.cards ?? []).map((c) => c.id).join(",")}`).join("|");
  useMemo(() => {
    setLocalStages(stages);
  }, [stagesKey]);

  const sortedStages = useMemo(
    () => [...localStages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [localStages]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Find which stage a card belongs to
  const findStageForCard = useCallback(
    (cardId: string): string | null => {
      for (const stage of localStages) {
        if (stage.cards?.some((c) => c.id === cardId)) {
          return stage.id;
        }
      }
      return null;
    },
    [localStages]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardData = active.data.current;
    if (cardData?.type === "card") {
      setActiveCard(cardData.card as RichKanbanCard);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverStageId(null);
      return;
    }

    const overId = String(over.id);
    if (overId.startsWith("stage-")) {
      setOverStageId(overId.replace("stage-", ""));
    } else {
      // Over a card — find its stage
      const stageId = findStageForCard(overId);
      setOverStageId(stageId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setOverStageId(null);

    if (!over) return;

    const cardId = String(active.id);
    const overId = String(over.id);

    // Determine target stage
    let targetStageId: string | null = null;
    if (overId.startsWith("stage-")) {
      targetStageId = overId.replace("stage-", "");
    } else {
      // Dropped over a card — find its stage
      targetStageId = findStageForCard(overId);
    }

    if (!targetStageId) return;

    const sourceStageId = findStageForCard(cardId);
    if (!sourceStageId || sourceStageId === targetStageId) return;

    // Optimistic update: move card between stages locally
    setLocalStages((prev) => {
      const next = prev.map((stage) => {
        if (stage.id === sourceStageId) {
          return { ...stage, cards: (stage.cards ?? []).filter((c) => c.id !== cardId) };
        }
        if (stage.id === targetStageId) {
          const movingCard = prev
            .find((s) => s.id === sourceStageId)
            ?.cards?.find((c) => c.id === cardId);
          if (movingCard) {
            return {
              ...stage,
              cards: [...(stage.cards ?? []), { ...movingCard, stage_id: targetStageId }],
            };
          }
        }
        return stage;
      });
      return next;
    });

    // API call
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
      // Revert on failure
      setLocalStages(stages);
    }
  };

  const handleCreateCard = async (stageId: string) => {
    if (!newCardTitle.trim()) return;
    try {
      const parsedValue = newCardValue.trim()
        ? parseFloat(newCardValue.replace(",", "."))
        : undefined;

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
          value_amount: parsedValue && !isNaN(parsedValue) ? parsedValue : undefined,
          priority: newCardPriority || undefined,
          assigned_to: newCardAssignee || undefined,
          phone: newCardPhone.trim() || undefined,
        }),
      });
      resetCreateForm();
      onRefresh();
    } catch {
      // Silently fail
    }
  };

  const resetCreateForm = () => {
    setCreatingInStage(null);
    setNewCardTitle("");
    setNewCardDesc("");
    setShowMoreFields(false);
    setNewCardValue("");
    setNewCardPriority("");
    setNewCardAssignee("");
    setNewCardPhone("");
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">{boardName ?? "Pipeline"}</h2>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            {sortedStages.map((stage, index) => {
              const cards = stage.cards ?? [];
              const colorClass = STAGE_COLORS[index % STAGE_COLORS.length];
              const cardIds = cards.map((c) => c.id);

              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  colorClass={colorClass}
                  isOver={overStageId === stage.id}
                >
                  {/* Create card form */}
                  {creatingInStage === stage.id ? (
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

                      {/* Toggle more fields */}
                      <button
                        onClick={() => setShowMoreFields(!showMoreFields)}
                        className="flex items-center gap-1 text-xs text-[#2EC4B6] hover:underline"
                      >
                        {showMoreFields ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {showMoreFields ? "Menos campos" : "Mais campos"}
                      </button>

                      {showMoreFields && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={newCardValue}
                            onChange={(e) => setNewCardValue(e.target.value)}
                            placeholder="Valor (R$)"
                            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none"
                          />
                          <select
                            value={newCardPriority}
                            onChange={(e) => setNewCardPriority(e.target.value)}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none"
                          >
                            <option value="">Prioridade</option>
                            <option value="alta">Alta</option>
                            <option value="media">Média</option>
                            <option value="baixa">Baixa</option>
                          </select>
                          {teamMembers.length > 0 ? (
                            <select
                              value={newCardAssignee}
                              onChange={(e) => setNewCardAssignee(e.target.value)}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none"
                            >
                              <option value="">Responsável</option>
                              {teamMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name ?? m.email ?? m.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={newCardAssignee}
                              onChange={(e) => setNewCardAssignee(e.target.value)}
                              placeholder="Responsável"
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none"
                            />
                          )}
                          <input
                            type="text"
                            value={newCardPhone}
                            onChange={(e) => setNewCardPhone(e.target.value)}
                            placeholder="Telefone"
                            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleCreateCard(stage.id)} disabled={!newCardTitle.trim()}>
                          Criar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetCreateForm}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreatingInStage(stage.id)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted hover:border-[#2EC4B6] hover:text-[#2EC4B6] transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Novo card
                    </button>
                  )}

                  <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {cards.map((card) => (
                      <KanbanCardItem
                        key={card.id}
                        card={card}
                        onClick={(id) => setSelectedCardId(id)}
                      />
                    ))}
                  </SortableContext>
                </StageColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="w-72">
                <KanbanCardItem card={activeCard} isDraggingOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <KanbanCardDrawer
        open={!!selectedCardId}
        onClose={() => setSelectedCardId(null)}
        cardId={selectedCardId}
        companyId={companyId}
        boardId={boardId}
        teamMembers={teamMembers}
        onRefresh={onRefresh}
      />
    </>
  );
}
