/**
 * Arquivo: src/services/usage/log.ts
 * Propósito: Logging de uso de IA com estimativa de custo por modelo.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiModule } from "@/types/modules/usage.types";

type LogAiUsageParams = {
  companyId: string;
  module: AiModule;
  operation: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isFallback?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Mapa de precos por modelo (USD por 1M tokens).
 * Fonte: https://openrouter.ai/models
 * Atualizar periodicamente conforme precos mudam.
 */
const PRICING_MAP: Record<string, { input: number; output: number }> = {
  // OpenAI
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-5-nano": { input: 0.1, output: 0.4 },
  // Google
  "google/gemini-2.0-flash-001": { input: 0.1, output: 0.4 },
  "google/gemma-3-27b-it:free": { input: 0, output: 0 },
  // Minimax
  "minimax/minimax-m2.5": { input: 1.1, output: 4.4 },
  // Meta
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
  // Qwen
  "qwen/qwen3-coder:free": { input: 0, output: 0 },
  // Mistral
  "mistralai/mistral-small-3.1-24b-instruct:free": { input: 0, output: 0 },
  // OpenRouter free
  "openrouter/free": { input: 0, output: 0 },
};

function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = PRICING_MAP[model];

  if (!pricing) {
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Registra uso de IA no banco (fire-and-forget).
 * Nao lanca erro para nao interromper o fluxo principal.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();

    const estimatedCost = estimateCostUsd(
      params.model,
      params.promptTokens,
      params.completionTokens
    );

    await supabase.from("ai_usage_log").insert({
      company_id: params.companyId,
      module: params.module,
      operation: params.operation,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      estimated_cost_usd: estimatedCost,
      is_fallback: params.isFallback ?? false,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error(
      "[ai-usage] Falha ao registrar uso de IA:",
      error instanceof Error ? error.message : error
    );
  }
}
