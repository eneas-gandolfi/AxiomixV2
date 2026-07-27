/**
 * Arquivo: src/components/whatsapp/kanban-board.helpers.ts
 * Propósito: Mutação otimista pura do kanban — mover card entre stages sem
 *            depender do dnd-kit, testável isoladamente.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import type { KanbanStage } from "./kanban-types";

/**
 * Retorna uma nova lista de stages com o card movido para o stage alvo
 * (append no final). Se o card ou o stage alvo não existirem, retorna a
 * lista original inalterada.
 */
export function moveCardBetweenStages(
  stages: KanbanStage[],
  cardId: string,
  targetStageId: string,
): KanbanStage[] {
  const sourceStage = stages.find((s) => s.cards?.some((c) => c.id === cardId));
  const targetStage = stages.find((s) => s.id === targetStageId);
  if (!sourceStage || !targetStage || sourceStage.id === targetStageId) {
    return stages;
  }
  const movingCard = sourceStage.cards?.find((c) => c.id === cardId);
  if (!movingCard) return stages;

  return stages.map((stage) => {
    if (stage.id === sourceStage.id) {
      return { ...stage, cards: (stage.cards ?? []).filter((c) => c.id !== cardId) };
    }
    if (stage.id === targetStageId) {
      return {
        ...stage,
        cards: [...(stage.cards ?? []), { ...movingCard, stage_id: targetStageId }],
      };
    }
    return stage;
  });
}
