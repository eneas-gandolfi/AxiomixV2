/**
 * Arquivo: src/lib/whatsapp/agent-activity.ts
 * Propósito: Audit imutável de eventos por agente IA (Evo CRM). Escreve em
 * public.agent_activity_log via service_role (a tabela bloqueia INSERT
 * para authenticated/anon — apenas leitura via RLS).
 *
 * Princípio: best-effort. Falha de auditoria NUNCA quebra o fluxo principal —
 * captura, loga via console.warn e segue.
 */

import "server-only";

import type { Json } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AgentActivityEvent =
  | { type: "activated" | "deactivated"; details?: Record<string, unknown> }
  | { type: "config_updated"; details: { changed: string[] } }
  | { type: "inbox_linked"; details: { inbox_id: string; integration_id?: string } }
  | { type: "inbox_unlinked"; details: { inbox_id?: string; integration_id: string } }
  | { type: "message_handled"; details: { conversation_id: string; message_id: string } }
  | {
      type: "error";
      details: { operation: string; status?: number; code?: string; message?: string };
    }
  | { type: "created" | "deleted"; details?: Record<string, unknown> };

export type AgentActivityEventType = AgentActivityEvent["type"];

export const AGENT_ACTIVITY_EVENT_TYPES: readonly AgentActivityEventType[] = [
  "activated",
  "deactivated",
  "config_updated",
  "inbox_linked",
  "inbox_unlinked",
  "message_handled",
  "error",
  "created",
  "deleted",
] as const;

export async function logAgentActivity(
  companyId: string,
  agentId: string,
  event: AgentActivityEvent,
  actorUserId?: string | null
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const details = ("details" in event ? event.details : {}) as Json;
    const { error } = await supabase.from("agent_activity_log").insert({
      company_id: companyId,
      agent_id: agentId,
      event_type: event.type,
      details,
      actor_user_id: actorUserId ?? null,
    });
    if (error) {
      console.warn("[agent-activity] insert failed", {
        companyId,
        agentId,
        type: event.type,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn("[agent-activity] unexpected failure", {
      companyId,
      agentId,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Compara duas partial-updates e retorna a lista de campos que mudaram.
 * Usado por updateAgent para construir o details de config_updated.
 *
 * Trata `null` e `""` como equivalentes (mesma representacao "vazio") porque o
 * parser do agente normaliza ausencia para null mas o form envia "".
 */
export function diffAgentFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[]
): string[] {
  const changed: string[] = [];
  for (const field of fields) {
    const a = normalize(before[field]);
    const b = normalize(after[field]);
    if (a !== b) changed.push(field);
  }
  return changed;
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  return value;
}
