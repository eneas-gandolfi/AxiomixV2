/**
 * Arquivo: src/lib/cron/scheduler.ts
 * Proposito: Scheduler de crons interno para deploy self-hosted (Docker/VPS).
 *            Chama as funcoes diretamente (sem HTTP) para compatibilidade com
 *            ambientes que bloqueiam self-requests (ex: Hostinger).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import cron from "node-cron";

async function safeRun(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(`[cron] ${label} → ok`, typeof result === "object" ? JSON.stringify(result) : "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[cron] ${label} falhou:`, detail);
  }
}

export function startCronScheduler(): void {
  if (process.env.DISABLE_CRONS === "true") {
    console.log("[cron] Crons desabilitados via DISABLE_CRONS=true");
    return;
  }

  console.log("[cron] Iniciando scheduler de crons...");

  // Heartbeat: a cada 5 minutos (housekeeping + recover + enqueue)
  cron.schedule("*/5 * * * *", async () => {
    const { runHeartbeat } = await import("@/lib/cron/heartbeat");
    await safeRun("heartbeat", runHeartbeat);
  });

  // Process jobs: a cada 2 minutos, ate 5 jobs por ciclo para nao estrangular a fila.
  cron.schedule("*/2 * * * *", async () => {
    const { processJobs } = await import("@/lib/jobs/processor");
    await safeRun("process-jobs", () => processJobs({ maxJobs: 5 }));
  });

  // Group proactive: a cada hora
  cron.schedule("0 * * * *", async () => {
    const { runGroupProactiveCron } = await import("@/lib/cron/group-proactive");
    await safeRun("group-proactive", runGroupProactiveCron);
  });

  // Group RAG batch: diario as 03:00 UTC
  cron.schedule("0 3 * * *", async () => {
    const { runGroupRagBatchCron } = await import("@/lib/cron/group-rag-batch");
    await safeRun("group-rag-batch", runGroupRagBatchCron);
  });

  // WhatsApp sync: horário — safety-net do webhook (F1). O webhook é a fonte
  // primária; este cron só reconcilia empresas com drift (webhook mudo).
  cron.schedule("30 * * * *", async () => {
    const { runWhatsappSyncCron } = await import("@/lib/cron/whatsapp-sync");
    await safeRun("whatsapp-sync", runWhatsappSyncCron);
  });

  // F3 (jul/2026): cron whatsapp-batch removido — análise de IA em lote
  // automática eliminada (custo de LLM recorrente). Análise agora é só sob
  // demanda (botão Analisar / bulk-analyze explícito).

  // Social publisher: a cada minuto (dispara posts agendados vencidos)
  cron.schedule("* * * * *", async () => {
    const { processDueScheduledPosts } = await import("@/services/social/poller");
    await safeRun("social-publisher", processDueScheduledPosts);
  });

  // Anomaly scan (Intelligence Layer): diário às 12:00 UTC (09:00 BRT) —
  // compara janela 7d vs baseline 21d por tenant e despacha alertas proativos.
  cron.schedule("0 12 * * *", async () => {
    const { runAnomalyScanCron } = await import("@/lib/cron/anomaly-scan");
    await safeRun("anomaly-scan", runAnomalyScanCron);
  });

  console.log("[cron] Scheduler de crons iniciado.");
}
