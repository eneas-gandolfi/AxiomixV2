const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function resolveCronJobs(env = process.env) {
  const jobs = [
    { label: "heartbeat", path: "/api/cron/heartbeat", intervalMs: 5 * MINUTE_MS },
    {
      label: "process-jobs",
      path: "/api/cron/process-jobs",
      intervalMs: 2 * MINUTE_MS,
      headers: { "x-cron-max-jobs": "5" },
    },
    {
      label: "group-proactive",
      path: "/api/cron/group-proactive",
      intervalMs: HOUR_MS,
      scheduleAtUtc: { minute: 0 },
    },
    {
      label: "group-rag-batch",
      path: "/api/cron/group-rag-batch",
      intervalMs: DAY_MS,
      scheduleAtUtc: { hour: 3, minute: 0 },
    },
    {
      label: "whatsapp-sync",
      path: "/api/cron/whatsapp-sync",
      intervalMs: HOUR_MS,
      scheduleAtUtc: { minute: 30 },
    },
  ];

  if (env.NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER === "true") {
    jobs.push({
      label: "social-publisher",
      path: "/api/cron/social-publisher",
      intervalMs: MINUTE_MS,
    });
  }

  if (env.NEXT_PUBLIC_FEATURE_INTELLIGENCE === "true") {
    jobs.push({
      label: "anomaly-scan",
      path: "/api/cron/anomaly-scan",
      intervalMs: DAY_MS,
      scheduleAtUtc: { hour: 12, minute: 0 },
    });
  }

  return jobs;
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

export function resolveInitialDelayMs(job, now = new Date(), fallbackDelayMs = 15_000) {
  if (!job.scheduleAtUtc) return fallbackDelayMs;

  const next = new Date(now);
  next.setUTCSeconds(0, 0);

  if (typeof job.scheduleAtUtc.hour === "number") {
    next.setUTCHours(job.scheduleAtUtc.hour, job.scheduleAtUtc.minute ?? 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  } else {
    next.setUTCMinutes(job.scheduleAtUtc.minute ?? 0, 0, 0);
    if (next <= now) next.setUTCHours(next.getUTCHours() + 1);
  }

  return Math.max(next.getTime() - now.getTime(), fallbackDelayMs);
}

async function runCronJob(job, baseUrl, headers) {
  const url = `${baseUrl}${job.path}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { ...headers, ...(job.headers ?? {}) },
    });
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

  const jobs = resolveCronJobs(env);
  const now = new Date();

  for (const job of jobs) {
    const initialDelayMs = resolveInitialDelayMs(job, now, startDelayMs);
    setTimeout(() => {
      void runCronJob(job, baseUrl, headers);
      setInterval(() => void runCronJob(job, baseUrl, headers), job.intervalMs);
    }, initialDelayMs);
  }

  console.log("[self-hosted-cron] worker iniciado", { baseUrl, jobs: jobs.length });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startSelfHostedCronWorker();
}
