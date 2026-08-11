import { describe, expect, it } from "vitest";
import {
  createCronHeaders,
  resolveCronJobs,
  resolveInternalBaseUrl,
  shouldRunSelfHostedCronWorker,
} from "../self-hosted-cron.mjs";

describe("self-hosted cron worker", () => {
  it("keeps core cron endpoints scheduled", () => {
    const labels = resolveCronJobs().map((job) => job.label);

    expect(labels).toEqual([
      "heartbeat",
      "process-jobs",
      "group-proactive",
      "group-rag-batch",
      "whatsapp-sync",
    ]);
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
