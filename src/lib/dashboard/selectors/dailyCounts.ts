/**
 * Arquivo: src/lib/dashboard/selectors/dailyCounts.ts
 * Propósito: Mapear as linhas da RPC `dashboard_daily_counts` (contagens por
 *            dia, day_offset 0 = hoje em BRT) para os arrays de sparkline
 *            oldest→newest consumidos pelos KPI cards do dashboard.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

export type DailyCountRow = {
  day_offset: number;
  conversation_count: number;
  opportunity_count: number;
};

export type KpiSparklines = {
  conversations: number[];
  opportunities: number[];
};

export function mapDailyCountsToSparklines(
  rows: DailyCountRow[],
  windowDays: number,
): KpiSparklines {
  const conversations = new Array<number>(windowDays).fill(0);
  const opportunities = new Array<number>(windowDays).fill(0);

  for (const row of rows) {
    if (row.day_offset < 0 || row.day_offset >= windowDays) continue;
    const index = windowDays - 1 - row.day_offset;
    conversations[index] = Number(row.conversation_count) || 0;
    opportunities[index] = Number(row.opportunity_count) || 0;
  }

  return { conversations, opportunities };
}
