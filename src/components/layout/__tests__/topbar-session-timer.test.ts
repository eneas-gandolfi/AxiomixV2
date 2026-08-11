import { describe, expect, it } from "vitest";
import { shouldShowSessionTimer } from "@/components/layout/topbar-session-timer";

describe("shouldShowSessionTimer", () => {
  it("hides remembered sessions and calm active sessions", () => {
    expect(shouldShowSessionTimer({ rememberMe: true, state: "active", seconds: 120 })).toBe(false);
    expect(shouldShowSessionTimer({ rememberMe: false, state: "active", seconds: 600 })).toBe(false);
  });

  it("shows only near expiry or during the warning state", () => {
    expect(shouldShowSessionTimer({ rememberMe: false, state: "active", seconds: 300 })).toBe(true);
    expect(shouldShowSessionTimer({ rememberMe: false, state: "warning", seconds: 600 })).toBe(true);
    expect(shouldShowSessionTimer({ rememberMe: false, state: "expired", seconds: 0 })).toBe(false);
  });
});
