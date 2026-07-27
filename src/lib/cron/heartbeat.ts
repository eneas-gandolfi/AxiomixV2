/**
 * Arquivo: src/lib/cron/heartbeat.ts
 * Propósito: Housekeeping da fila de jobs — recover de jobs travados, marcação
 *            de stale e agregação de uso de IA.
 *
 *            F3 (jul/2026): o heartbeat NÃO enfileira mais análises de IA
 *            automáticas (custo recorrente de LLM eliminado — análise agora é
 *            só sob demanda via botão/bulk). O enfileiramento de syncs também
 *            saiu daqui: vivia duplicado com o cron dedicado whatsapp-sync,
 *            que virou o único responsável (safety-net horário do webhook).
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { recoverAllStaleJobs, markAllStaleJobsFailed } from "@/lib/jobs/queue";
import { aggregateUsageForDate } from "@/services/usage/aggregate";

type HeartbeatResult = {
  recovered: number;
  staleMarkedFailed: number;
  usageAggregated: number;
};

export async function runHeartbeat(): Promise<HeartbeatResult> {
  // 1. Recuperar jobs travados em running há mais de 5 min
  const recovered = await recoverAllStaleJobs(5);

  // 2. Marcar como failed jobs que passaram do limite (pending >10min, running >30min)
  const staleMarkedFailed = await markAllStaleJobsFailed();

  // 3. Agregar uso de IA do dia anterior (roda apenas no primeiro heartbeat de cada hora)
  let usageAggregated = 0;
  if (new Date().getMinutes() === 0) {
    try {
      usageAggregated = await aggregateUsageForDate();
    } catch (error) {
      console.error("[heartbeat] Falha na agregação de uso de IA:", error);
    }
  }

  return {
    recovered,
    staleMarkedFailed,
    usageAggregated,
  };
}
