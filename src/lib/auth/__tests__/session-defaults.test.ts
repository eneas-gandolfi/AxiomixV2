import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMEMBER_ME,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
} from "@/lib/auth/constants";

describe("session defaults", () => {
  it("keeps users remembered by default and makes temporary sessions less aggressive", () => {
    expect(DEFAULT_REMEMBER_ME).toBe(true);
    expect(IDLE_TIMEOUT_MS).toBe(4 * 60 * 60 * 1000);
    expect(IDLE_WARNING_MS).toBe(IDLE_TIMEOUT_MS - 5 * 60 * 1000);
  });
});
