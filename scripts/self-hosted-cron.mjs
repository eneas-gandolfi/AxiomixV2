const MINUTE_MS = 60_000;

export function resolveCronJobs() {
  return [
    { label: "heartbeat", path: "/api/cron/heartbeat", intervalMs: 5 * MINUTE_MS },
    { label: "process-jobs", path: "/api/cron/process-jobs", intervalMs: 2 * MINUTE_MS },
    { label: "group-proactive", path: "/api/cron/group-proactive", intervalMs: 60 * MINUTE_MS },
    { label: "group-rag-batch", path: "/api/cron/group-rag-batch", intervalMs: 24 * 60 * MINUTE_MS },
    { label: "whatsapp-sync", path: "/api/cron/whatsapp-sync", intervalMs: 60 * MINUTE_MS },
  ];
}

export function resolveInternalBaseUrl(env = process.env) {
  const configured = env.AXIOMIX_INTERNAL_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const port = env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
}

export function createCronHeaders(env = process.env) {
  const secret = env.CRON_SECRET?.trim();
  return {
    "x-cron-secret": secret,
    authorization: `Bearer ${secret}`,
  };
}

export function shouldRunSelfHostedCronWorker(env = process.env) {
  return env.DISABLE_CRONS !== "true" && Boolean(env.CRON_SECRET?.trim());
}

async function runCronJob(job, baseUrl, headers) {
  const url = `${baseUrl}${job.path}`;
  try {
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[self-hosted-cron] ${job.label} falhou`, {
        status: response.status,
        body: body.slice(0, 240),
      });
      return;
    }

    console.log(`[self-hosted-cron] ${job.label} ok`);
  } catch (error) {
    console.error(`[self-hosted-cron] ${job.label} erro`, error instanceof Error ? error.message : error);
  }
}

export function startSelfHostedCronWorker(env = process.env) {
  if (!shouldRunSelfHostedCronWorker(env)) {
    console.log("[self-hosted-cron] desabilitado: configure CRON_SECRET ou ajuste DISABLE_CRONS.");
    return;
  }

  const baseUrl = resolveInternalBaseUrl(env);
  const headers = createCronHeaders(env);
  const startDelayMs = Number(env.SELF_HOSTED_CRON_START_DELAY_MS ?? 15_000);

  for (const job of resolveCronJobs()) {
    setTimeout(() => {
      void runCronJob(job, baseUrl, headers);
      setInterval(() => void runCronJob(job, baseUrl, headers), job.intervalMs);
    }, startDelayMs);
  }

  console.log("[self-hosted-cron] worker iniciado", { baseUrl, jobs: resolveCronJobs().length });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startSelfHostedCronWorker();
}
