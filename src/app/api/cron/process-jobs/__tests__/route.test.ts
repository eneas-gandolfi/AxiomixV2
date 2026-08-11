import { describe, expect, it } from "vitest";
import { resolveProcessJobsMaxJobs } from "../process-jobs-limits";

describe("resolveProcessJobsMaxJobs", () => {
  it("uses a safe default for external cron calls", () => {
    expect(resolveProcessJobsMaxJobs(new Headers())).toBe(1);
  });

  it("allows the self-hosted worker to preserve the internal batch size", () => {
    expect(resolveProcessJobsMaxJobs(new Headers({ "x-cron-max-jobs": "5" }))).toBe(5);
  });

  it("caps requested batch size", () => {
    expect(resolveProcessJobsMaxJobs(new Headers({ "x-cron-max-jobs": "99" }))).toBe(5);
  });
});
