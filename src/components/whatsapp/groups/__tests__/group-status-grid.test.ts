import { describe, expect, it } from "vitest";
import { getAgentModeLabel } from "../group-status-grid";

describe("getAgentModeLabel", () => {
  it("keeps all group agent modes visible", () => {
    expect(getAgentModeLabel("radar_only")).toBe("Radar");
    expect(getAgentModeLabel("trigger_only")).toBe("Trigger");
    expect(getAgentModeLabel("proactive")).toBe("Proativo");
  });
});
