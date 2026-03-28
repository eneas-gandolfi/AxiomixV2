/**
 * Arquivo: src/services/usage/stats.ts
 * Propósito: Consulta de estatísticas de uso de IA (somente owner).
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  UsageSummary,
  UsageByModule,
  UsageByModel,
  UsageByDay,
  UsageResponse,
} from "@/types/modules/usage.types";

function getDateRange(period: "7d" | "30d"): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const daysBack = period === "7d" ? 7 : 30;
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - daysBack);
  const from = fromDate.toISOString().split("T")[0];
  return { from, to };
}

export async function getUsageStats(
  companyId: string,
  period: "7d" | "30d" = "7d"
): Promise<UsageResponse> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = getDateRange(period);

  const { data: rows, error } = await supabase
    .from("ai_usage_daily_summary")
    .select("*")
    .eq("company_id", companyId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) {
    console.error("[usage-stats] Falha ao buscar resumo:", error.message);
    return emptyResponse(period);
  }

  const data = rows ?? [];

  // Summary
  const summary: UsageSummary = {
    period,
    total_calls: 0,
    total_tokens: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_cost_usd: 0,
  };

  const moduleMap = new Map<string, UsageByModule>();
  const modelMap = new Map<string, UsageByModel>();
  const dayMap = new Map<string, UsageByDay>();

  for (const row of data) {
    const calls = row.total_calls ?? 0;
    const tokens = Number(row.total_tokens ?? 0);
    const promptTokens = Number(row.total_prompt_tokens ?? 0);
    const completionTokens = Number(row.total_completion_tokens ?? 0);
    const cost = Number(row.total_cost_usd ?? 0);

    summary.total_calls += calls;
    summary.total_tokens += tokens;
    summary.total_prompt_tokens += promptTokens;
    summary.total_completion_tokens += completionTokens;
    summary.total_cost_usd += cost;

    // By module
    const mod = moduleMap.get(row.module) ?? { module: row.module, total_calls: 0, total_tokens: 0, total_cost_usd: 0 };
    mod.total_calls += calls;
    mod.total_tokens += tokens;
    mod.total_cost_usd += cost;
    moduleMap.set(row.module, mod);

    // By model
    const mdl = modelMap.get(row.model) ?? { model: row.model, total_calls: 0, total_tokens: 0, total_cost_usd: 0 };
    mdl.total_calls += calls;
    mdl.total_tokens += tokens;
    mdl.total_cost_usd += cost;
    modelMap.set(row.model, mdl);

    // By day
    const day = dayMap.get(row.date) ?? { date: row.date, total_calls: 0, total_tokens: 0, total_cost_usd: 0 };
    day.total_calls += calls;
    day.total_tokens += tokens;
    day.total_cost_usd += cost;
    dayMap.set(row.date, day);
  }

  summary.total_cost_usd = Math.round(summary.total_cost_usd * 1_000_000) / 1_000_000;

  return {
    summary,
    byModule: Array.from(moduleMap.values()).sort((a, b) => b.total_cost_usd - a.total_cost_usd),
    byModel: Array.from(modelMap.values()).sort((a, b) => b.total_cost_usd - a.total_cost_usd),
    byDay: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function emptyResponse(period: string): UsageResponse {
  return {
    summary: { period, total_calls: 0, total_tokens: 0, total_prompt_tokens: 0, total_completion_tokens: 0, total_cost_usd: 0 },
    byModule: [],
    byModel: [],
    byDay: [],
  };
}
