/**
 * Arquivo: src/lib/cron/scheduler.ts
 * Proposito: Scheduler de crons interno para deploy self-hosted (Docker/VPS).
 * Substitui os crons do vercel.json e netlify.toml.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import cron from "node-cron";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";

async function callCronEndpoint(path: string, label: string): Promise<void> {
  try {
    const url = `${APP_URL}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "x-cron-secret": CRON_SECRET,
      },
    });
    console.log(`[cron] ${label} → ${res.status}`);
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

  // Heartbeat: a cada 5 minutos (housekeeping + process jobs)
  cron.schedule("*/5 * * * *", () => {
    callCronEndpoint("/api/cron/heartbeat", "heartbeat");
  });

  // Process jobs: a cada 2 minutos
  cron.schedule("*/2 * * * *", () => {
    callCronEndpoint("/api/cron/process-jobs", "process-jobs");
  });

  // Group proactive: a cada hora
  cron.schedule("0 * * * *", () => {
    callCronEndpoint("/api/cron/group-proactive", "group-proactive");
  });

  // Group RAG batch: diario as 03:00 UTC
  cron.schedule("0 3 * * *", () => {
    callCronEndpoint("/api/cron/group-rag-batch", "group-rag-batch");
  });

  // Relatorio diario: diario as 22:00 UTC
  cron.schedule("0 22 * * *", () => {
    callCronEndpoint("/api/report/daily", "report-daily");
  });

  // Relatorio semanal: segunda as 11:00 UTC
  cron.schedule("0 11 * * 1", () => {
    callCronEndpoint("/api/report/send", "report-send");
  });

  // WhatsApp sync: a cada 15 minutos
  cron.schedule("*/15 * * * *", () => {
    callCronEndpoint("/api/cron/whatsapp-sync", "whatsapp-sync");
  });

  // WhatsApp batch analyze: a cada 10 minutos
  cron.schedule("*/10 * * * *", () => {
    callCronEndpoint("/api/cron/whatsapp-batch", "whatsapp-batch");
  });

  console.log("[cron] 8 crons agendados com sucesso.");
}
