/**
 * Arquivo: src/lib/dashboard/selectors/stalledConversations.ts
 * Propósito: Selector do número-herói do dashboard global ("Conversas paradas").
 *            Espelho 1:1 do que a Operação destaca — mesmo cálculo de TFR,
 *            mesmo threshold por nicho. Reusa `getLiveOperationData` como
 *            única fonte da verdade pra evitar divergência de número entre
 *            dashboard e operação (Sally's red line).
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";
import {
  getLiveOperationData,
  type ConversationSeverity,
} from "@/lib/whatsapp/live-operation";

export type StalledItem = {
  conversationId: string;
  customerName: string;
  waitSeconds: number;
  severity: Extract<ConversationSeverity, "amber" | "red">;
};

export type StalledConversations = {
  /** Total de conversas com cliente esperando há mais que o threshold âmbar
   *  (severity in ["amber", "red"]). Esse é o número-herói. */
  count: number;
  /** Itens individuais (top N pela severidade + tempo de espera).
   *  No MVP, expomos só os que vêm diretamente do `LiveOperationData`
   *  (mostForgotten + inRiskQueue) — máximo 6 itens. F3 (insight TFR) consome. */
  items: StalledItem[];
  /** Thresholds em segundos derivados do nicho. */
  amberSeconds: number;
  redSeconds: number;
};

/**
 * Retorna o estado de "Conversas paradas" pro dashboard global.
 *
 * Decisão de design: NÃO faz query própria. Delega pra `getLiveOperationData`
 * pra garantir consistência com a aba Operação. Se Operação diz "3 em risco",
 * o dashboard mostra "3 conversas paradas". Divergir entre as duas telas
 * é o pior bug de produto possível aqui (perde confiança no número).
 */
export async function selectStalledConversations(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<StalledConversations> {
  const op = await getLiveOperationData(supabase, companyId);

  const stalledList = [
    ...(op.mostForgotten && op.mostForgotten.severity !== "ok"
      ? [op.mostForgotten]
      : []),
    ...op.inRiskQueue,
  ];

  const items: StalledItem[] = stalledList.map((w) => ({
    conversationId: w.conversationId,
    customerName: w.customerName,
    waitSeconds: w.waitSeconds,
    severity: w.severity as Extract<ConversationSeverity, "amber" | "red">,
  }));

  return {
    count: op.stalledCount,
    items,
    amberSeconds: op.thresholds.amberSeconds,
    redSeconds: op.thresholds.redSeconds,
  };
}
