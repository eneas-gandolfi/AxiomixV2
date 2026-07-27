/**
 * Testa a mutação otimista pura do kanban (moveCardBetweenStages) — F6.
 */

import { describe, it, expect } from "vitest";
import { moveCardBetweenStages } from "../kanban-board.helpers";
import type { KanbanStage } from "../kanban-types";

function makeStages(): KanbanStage[] {
  return [
    {
      id: "s1",
      name: "Novo",
      position: 0,
      cards: [
        { id: "c1", title: "Card 1", stage_id: "s1" },
        { id: "c2", title: "Card 2", stage_id: "s1" },
      ],
    },
    { id: "s2", name: "Negociação", position: 1, cards: [] },
  ] as unknown as KanbanStage[];
}

describe("moveCardBetweenStages", () => {
  it("move o card pro stage alvo e atualiza stage_id", () => {
    const result = moveCardBetweenStages(makeStages(), "c1", "s2");
    expect(result[0].cards?.map((c) => c.id)).toEqual(["c2"]);
    expect(result[1].cards?.map((c) => c.id)).toEqual(["c1"]);
    expect(result[1].cards?.[0].stage_id).toBe("s2");
  });

  it("não muta a lista original (permite snapshot pra rollback)", () => {
    const stages = makeStages();
    const result = moveCardBetweenStages(stages, "c1", "s2");
    expect(result).not.toBe(stages);
    expect(stages[0].cards?.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(stages[1].cards).toEqual([]);
  });

  it("retorna a lista inalterada quando o card não existe", () => {
    const stages = makeStages();
    expect(moveCardBetweenStages(stages, "ghost", "s2")).toBe(stages);
  });

  it("retorna a lista inalterada quando o stage alvo não existe", () => {
    const stages = makeStages();
    expect(moveCardBetweenStages(stages, "c1", "ghost")).toBe(stages);
  });

  it("retorna a lista inalterada quando origem === alvo", () => {
    const stages = makeStages();
    expect(moveCardBetweenStages(stages, "c1", "s1")).toBe(stages);
  });
});
