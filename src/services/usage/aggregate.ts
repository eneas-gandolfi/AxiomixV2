/**
 * Arquivo: src/services/usage/aggregate.ts
 * Propósito: Agrega logs de uso de IA em resumo diário.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Agrega logs do dia anterior (ou de uma data especifica) em ai_usage_daily_summary.
 * Seguro para chamar múltiplas vezes — usa upsert com ON CONFLICT.
 */
export async function aggregateUsageForDate(targetDate?: string): Promise<number> {
  const supabase = createSupabaseAdminClient();

  const date = targetDate ?? getYesterdayDateString();
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // Buscar logs agrupados do dia
  const { data: logs, error: logsError } = await supabase
    .from("ai_usage_log")
    .select("company_id, module, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  if (logsError) {
    console.error("[usage-aggregate] Falha ao buscar logs:", logsError.message);
    return 0;
  }

  if (!logs || logs.length === 0) {
    return 0;
  }

  // Agrupar por company_id + module + model
  const groups = new Map<string, {
    company_id: string;
    module: string;
    model: string;
    total_calls: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    total_cost_usd: number;
  }>();

  for (const log of logs) {
    const key = `${log.company_id}|${log.module}|${log.model}`;
    const existing = groups.get(key);

    if (existing) {
      existing.total_calls++;
      existing.total_prompt_tokens += log.prompt_tokens;
      existing.total_completion_tokens += log.completion_tokens;
      existing.total_tokens += log.total_tokens;
      existing.total_cost_usd += Number(log.estimated_cost_usd);
    } else {
      groups.set(key, {
        company_id: log.company_id,
        module: log.module,
        model: log.model,
        total_calls: 1,
        total_prompt_tokens: log.prompt_tokens,
        total_completion_tokens: log.completion_tokens,
        total_tokens: log.total_tokens,
        total_cost_usd: Number(log.estimated_cost_usd),
      });
    }
  }

  // Upsert em ai_usage_daily_summary
  const rows = Array.from(groups.values()).map((g) => ({
    company_id: g.company_id,
    date,
    module: g.module,
    model: g.model,
    total_calls: g.total_calls,
    total_prompt_tokens: g.total_prompt_tokens,
    total_completion_tokens: g.total_completion_tokens,
    total_tokens: g.total_tokens,
    total_cost_usd: Math.round(g.total_cost_usd * 1_000_000) / 1_000_000,
  }));

  const { error: upsertError } = await supabase
    .from("ai_usage_daily_summary")
    .upsert(rows, { onConflict: "company_id,date,module,model" });

  if (upsertError) {
    console.error("[usage-aggregate] Falha no upsert:", upsertError.message);
    return 0;
  }

  return rows.length;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
