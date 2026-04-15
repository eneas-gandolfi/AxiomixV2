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

  // Process jobs: a cada 2 minutos
  cron.schedule("*/2 * * * *", async () => {
    const { processJobs } = await import("@/lib/jobs/processor");
    await safeRun("process-jobs", () => processJobs({ maxJobs: 1 }));
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

  // Relatorio diario: diario as 22:00 UTC
  cron.schedule("0 22 * * *", async () => {
    const { runDailyReportCron } = await import("@/lib/cron/report-daily");
    await safeRun("report-daily", runDailyReportCron);
  });

  // Relatorio semanal: segunda as 11:00 UTC
  cron.schedule("0 11 * * 1", async () => {
    const { runWeeklyReportCron } = await import("@/lib/cron/report-send");
    await safeRun("report-send", runWeeklyReportCron);
  });

  // WhatsApp sync: a cada 10 minutos
  cron.schedule("*/10 * * * *", async () => {
    const { runWhatsappSyncCron } = await import("@/lib/cron/whatsapp-sync");
    await safeRun("whatsapp-sync", runWhatsappSyncCron);
  });

  // WhatsApp batch analyze: a cada 30 minutos
  cron.schedule("*/30 * * * *", async () => {
    const { runWhatsappBatchCron } = await import("@/lib/cron/whatsapp-batch");
    await safeRun("whatsapp-batch", runWhatsappBatchCron);
  });

  // Social publisher: a cada minuto (dispara posts agendados vencidos)
  cron.schedule("* * * * *", async () => {
    const { processDueScheduledPosts } = await import("@/services/social/poller");
    await safeRun("social-publisher", processDueScheduledPosts);
  });

  console.log("[cron] 9 crons agendados com sucesso.");
}
