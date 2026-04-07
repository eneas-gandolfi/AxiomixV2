/**
 * Arquivo: src/instrumentation.ts
 * Proposito: Next.js Instrumentation — executado uma vez no startup do servidor.
 * Inicializa o scheduler de crons para deploy self-hosted.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronScheduler } = await import("@/lib/cron/scheduler");
    startCronScheduler();
  }
}
