export function resolveProcessJobsMaxJobs(headers: Headers): number {
  const requested = Number(headers.get("x-cron-max-jobs") ?? "1");
  if (!Number.isFinite(requested)) return 1;
  return Math.min(Math.max(Math.floor(requested), 1), 5);
}
