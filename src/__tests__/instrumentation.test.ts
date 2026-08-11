import { describe, expect, it } from "vitest";
import { shouldStartCronSchedulerInWebProcess } from "@/instrumentation";

describe("shouldStartCronSchedulerInWebProcess", () => {
  it("keeps cron jobs out of the development web process", () => {
    expect(
      shouldStartCronSchedulerInWebProcess({
        NODE_ENV: "development",
        NEXT_RUNTIME: "nodejs",
      })
    ).toBe(false);
  });

  it("keeps cron jobs out of the production web process", () => {
    expect(
      shouldStartCronSchedulerInWebProcess({
        NODE_ENV: "production",
        NEXT_RUNTIME: "nodejs",
      })
    ).toBe(false);
  });

  it("never starts cron jobs outside the node runtime", () => {
    expect(
      shouldStartCronSchedulerInWebProcess({
        NODE_ENV: "production",
        NEXT_RUNTIME: "edge",
      })
    ).toBe(false);
  });
});
