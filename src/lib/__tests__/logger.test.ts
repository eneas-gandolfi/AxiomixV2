import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestStore } from "@/lib/observability/request-context";
import { log } from "@/lib/logger";

let consoleSpy: {
  log: ReturnType<typeof vi.spyOn>;
  warn: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
};

describe("Structured Logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  it("log.info outputs JSON with msg, level, timestamp", () => {
    log.info("test message");

    expect(consoleSpy.log).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);

    expect(output.msg).toBe("test message");
    expect(output.level).toBe("info");
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("log.warn outputs with level warn", () => {
    log.warn("warning message");

    expect(consoleSpy.warn).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);

    expect(output.level).toBe("warn");
    expect(output.msg).toBe("warning message");
  });

  it("log.error outputs with level error", () => {
    log.error("error message");

    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);

    expect(output.level).toBe("error");
    expect(output.msg).toBe("error message");
  });

  it("includes extra context fields in output", () => {
    log.info("with context", { userId: "u-123", action: "login" });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);

    expect(output.userId).toBe("u-123");
    expect(output.action).toBe("login");
  });

  it("auto-attaches requestId from AsyncLocalStorage context", () => {
    requestStore.run({ requestId: "req-abc-456" }, () => {
      log.info("inside context");
    });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.requestId).toBe("req-abc-456");
  });

  it("auto-attaches tenantId and userId from context when available", () => {
    requestStore.run(
      { requestId: "req-xyz", tenantId: "company-1", userId: "user-1" },
      () => {
        log.error("tenant error");
      }
    );

    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
    expect(output.requestId).toBe("req-xyz");
    expect(output.tenantId).toBe("company-1");
    expect(output.userId).toBe("user-1");
  });

  it("works without AsyncLocalStorage context (requestId undefined)", () => {
    log.info("no context");

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.requestId).toBeUndefined();
    expect(output.msg).toBe("no context");
  });

  it("explicit context overrides auto-attached context", () => {
    requestStore.run({ requestId: "auto-id" }, () => {
      log.info("override test", { requestId: "explicit-id" });
    });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.requestId).toBe("explicit-id");
  });
});
