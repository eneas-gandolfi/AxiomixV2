/**
 * Arquivo: src/lib/dashboard/selectors/__tests__/dailyCounts.test.ts
 * Propósito: Garantir o mapeamento das linhas agregadas por dia (RPC
 *            dashboard_daily_counts) para os arrays de sparkline
 *            (oldest→newest) usados pelos KPI cards.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

import { describe, expect, it } from "vitest";
import { mapDailyCountsToSparklines } from "@/lib/dashboard/selectors/dailyCounts";

describe("mapDailyCountsToSparklines", () => {
  it("posiciona day_offset 0 (hoje) na última posição e o mais antigo na primeira", () => {
    const rows = [
      { day_offset: 0, conversation_count: 5, opportunity_count: 1 },
      { day_offset: 6, conversation_count: 2, opportunity_count: 0 },
    ];

    const result = mapDailyCountsToSparklines(rows, 7);

    expect(result.conversations).toEqual([2, 0, 0, 0, 0, 0, 5]);
    expect(result.opportunities).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  it("preenche com zeros quando não há linhas", () => {
    const result = mapDailyCountsToSparklines([], 7);

    expect(result.conversations).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(result.opportunities).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("ignora offsets fora da janela", () => {
    const rows = [
      { day_offset: 9, conversation_count: 3, opportunity_count: 3 },
      { day_offset: -1, conversation_count: 4, opportunity_count: 4 },
      { day_offset: 1, conversation_count: 7, opportunity_count: 2 },
    ];

    const result = mapDailyCountsToSparklines(rows, 7);

    expect(result.conversations).toEqual([0, 0, 0, 0, 0, 7, 0]);
    expect(result.opportunities).toEqual([0, 0, 0, 0, 0, 2, 0]);
  });
});
