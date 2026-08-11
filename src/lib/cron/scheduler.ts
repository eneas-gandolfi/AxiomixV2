/**
 * Arquivo: src/lib/cron/scheduler.ts
 * Proposito: Scheduler de crons interno para deploy self-hosted (Docker/VPS).
 *            Chama as funcoes diretamente (sem HTTP) para compatibilidade com
 *            ambientes que bloqueiam self-requests (ex: Hostinger).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import cron from "node-cron";

export type CronRegistration = {
  label: string;
  schedule: string;
  enabled: boolean;
  run: () => Promise<unknown>;
};

type CronEnv = Record<string, string | undefined>;

async function safeRun(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(`[cron] ${label} → ok`, typeof result === "object" ? JSON.stringify(result) : "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[cron] ${label} falhou:`, detail);
  }
}

export function resolveCronRegistrations(env: CronEnv): CronRegistration[] {
  const socialEnabled = env.NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER === "true";
  const intelligenceEnabled = env.NEXT_PUBLIC_FEATURE_INTELLIGENCE === "true";

  return [
    {
      label: "heartbeat",
      schedule: "*/5 * * * *",
      enabled: true,
      run: async () => {
        const { runHeartbeat } = await import("@/lib/cron/heartbeat");
        return runHeartbeat();
      },
    },
    {
      label: "process-jobs",
      schedule: "*/2 * * * *",
      enabled: true,
      run: async () => {
        const { processJobs } = await import("@/lib/jobs/processor");
        return processJobs({ maxJobs: 5 });
      },
    },
    {
      label: "group-proactive",
      schedule: "0 * * * *",
      enabled: true,
      run: async () => {
        const { runGroupProactiveCron } = await import("@/lib/cron/group-proactive");
        return runGroupProactiveCron();
      },
    },
    {
      label: "group-rag-batch",
      schedule: "0 3 * * *",
      enabled: true,
      run: async () => {
        const { runGroupRagBatchCron } = await import("@/lib/cron/group-rag-batch");
        return runGroupRagBatchCron();
      },
    },
    {
      label: "whatsapp-sync",
      schedule: "30 * * * *",
      enabled: true,
      run: async () => {
        const { runWhatsappSyncCron } = await import("@/lib/cron/whatsapp-sync");
        return runWhatsappSyncCron();
      },
    },
    {
      label: "social-publisher",
      schedule: "* * * * *",
      enabled: socialEnabled,
      run: async () => {
        const { processDueScheduledPosts } = await import("@/services/social/poller");
        return processDueScheduledPosts();
      },
    },
    {
      label: "anomaly-scan",
      schedule: "0 12 * * *",
      enabled: intelligenceEnabled,
      run: async () => {
        const { runAnomalyScanCron } = await import("@/lib/cron/anomaly-scan");
        return runAnomalyScanCron();
      },
    },
  ];
}

export function startCronScheduler(): void {
  if (process.env.DISABLE_CRONS === "true") {
    console.log("[cron] Crons desabilitados via DISABLE_CRONS=true");
    return;
  }

  console.log("[cron] Iniciando scheduler de crons...");

  for (const registration of resolveCronRegistrations(process.env)) {
    if (!registration.enabled) {
      console.log(`[cron] ${registration.label} desabilitado por feature flag`);
      continue;
    }

    cron.schedule(registration.schedule, async () => {
      await safeRun(registration.label, registration.run);
    });
  }

  console.log("[cron] Scheduler de crons iniciado.");
}
