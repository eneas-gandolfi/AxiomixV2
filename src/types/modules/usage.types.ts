/**
 * Arquivo: src/types/modules/usage.types.ts
 * Propósito: Tipos para rastreamento de uso de IA e custos (somente owner).
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

export type AiModule =
  | "whatsapp"
  | "group_agent"
  | "rag"
  | "reports"
  | "intelligence"
  | "social"
  | "unknown";

export type AiUsageLog = {
  id: string;
  company_id: string;
  module: AiModule;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  is_fallback: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AiUsageDailySummary = {
  id: string;
  company_id: string;
  date: string;
  module: string;
  model: string;
  total_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  created_at: string;
};

export type UsageSummary = {
  period: string;
  total_calls: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_usd: number;
};

export type UsageByModule = {
  module: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
};

export type UsageByModel = {
  model: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
};

export type UsageByDay = {
  date: string;
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
};

export type UsageResponse = {
  summary: UsageSummary;
  byModule: UsageByModule[];
  byModel: UsageByModel[];
  byDay: UsageByDay[];
};

export const MODULE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp Intelligence",
  group_agent: "Agente de Grupo",
  rag: "Base de Conhecimento",
  reports: "Relatórios",
  intelligence: "Inteligência Competitiva",
  social: "Social Publisher",
  unknown: "Outros",
};
