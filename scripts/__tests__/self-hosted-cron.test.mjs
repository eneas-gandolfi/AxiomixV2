import { describe, expect, it } from "vitest";
import {
  createCronHeaders,
  resolveInitialDelayMs,
  resolveCronJobs,
  resolveInternalBaseUrl,
  shouldRunSelfHostedCronWorker,
} from "../self-hosted-cron.mjs";

describe("self-hosted cron worker", () => {
  it("keeps core cron endpoints scheduled", () => {
    const labels = resolveCronJobs({}).map((job) => job.label);

    expect(labels).toEqual([
      "heartbeat",
      "process-jobs",
      "group-proactive",
      "group-rag-batch",
      "whatsapp-sync",
    ]);
  });

  it("keeps self-hosted job processing at the previous batch size", () => {
    const processJobs = resolveCronJobs({}).find((job) => job.label === "process-jobs");

    expect(processJobs?.headers).toEqual({ "x-cron-max-jobs": "5" });
  });

  it("adds satellite cron endpoints only when feature flags are enabled", () => {
    const labels = resolveCronJobs({
      NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER: "true",
      NEXT_PUBLIC_FEATURE_INTELLIGENCE: "true",
    }).map((job) => job.label);

    expect(labels).toContain("social-publisher");
    expect(labels).toContain("anomaly-scan");
  });

  it("delays fixed-time daily jobs until their configured UTC hour", () => {
    const [groupRagBatch] = resolveCronJobs({}).filter((job) => job.label === "group-rag-batch");

    expect(
      resolveInitialDelayMs(
        groupRagBatch,
        new Date("2026-08-11T02:30:00.000Z"),
        15_000
      )
    ).toBe(30 * 60_000);

    expect(
      resolveInitialDelayMs(
        groupRagBatch,
        new Date("2026-08-11T03:05:00.000Z"),
        15_000
      )
    ).toBe(23 * 60 * 60_000 + 55 * 60_000);
  });

  it("builds authenticated cron headers from CRON_SECRET", () => {
    expect(createCronHeaders({ CRON_SECRET: "secret-value" })).toEqual({
      "x-cron-secret": "secret-value",
      authorization: "Bearer secret-value",
    });
  });

  it("disables worker when crons or secret are missing", () => {
    expect(
      shouldRunSelfHostedCronWorker({
        DISABLE_CRONS: "true",
        CRON_SECRET: "secret-value",
      })
    ).toBe(false);
    expect(shouldRunSelfHostedCronWorker({})).toBe(false);
  });

  it("uses the container-local base url by default", () => {
    expect(resolveInternalBaseUrl({ PORT: "8080" })).toBe("http://127.0.0.1:8080");
    expect(resolveInternalBaseUrl({ AXIOMIX_INTERNAL_BASE_URL: "http://app:3000/" })).toBe(
      "http://app:3000"
    );
  });
});
