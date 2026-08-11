import { describe, expect, it } from "vitest";
import { resolveCronRegistrations } from "../scheduler";

describe("resolveCronRegistrations", () => {
  it("keeps core whatsapp/group jobs enabled by default", () => {
    const labels = resolveCronRegistrations({})
      .filter((job) => job.enabled)
      .map((job) => job.label);

    expect(labels).toContain("heartbeat");
    expect(labels).toContain("process-jobs");
    expect(labels).toContain("group-proactive");
    expect(labels).toContain("group-rag-batch");
    expect(labels).toContain("whatsapp-sync");
  });

  it("disables social publisher when NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER is not true", () => {
    const social = resolveCronRegistrations({}).find(
      (job) => job.label === "social-publisher"
    );

    expect(social?.enabled).toBe(false);
  });

  it("enables social publisher when NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER is true", () => {
    const social = resolveCronRegistrations({
      NEXT_PUBLIC_FEATURE_SOCIAL_PUBLISHER: "true",
    }).find((job) => job.label === "social-publisher");

    expect(social?.enabled).toBe(true);
  });

  it("disables anomaly scan when NEXT_PUBLIC_FEATURE_INTELLIGENCE is not true", () => {
    const anomaly = resolveCronRegistrations({}).find(
      (job) => job.label === "anomaly-scan"
    );

    expect(anomaly?.enabled).toBe(false);
  });

  it("enables anomaly scan when NEXT_PUBLIC_FEATURE_INTELLIGENCE is true", () => {
    const anomaly = resolveCronRegistrations({
      NEXT_PUBLIC_FEATURE_INTELLIGENCE: "true",
    }).find((job) => job.label === "anomaly-scan");

    expect(anomaly?.enabled).toBe(true);
  });
});
