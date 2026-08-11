import { afterEach, describe, expect, it, vi } from "vitest";
import { logDirectoryFallback } from "../directory-fallback-log";

describe("logDirectoryFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs recoverable directory failures as warnings instead of errors", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logDirectoryFallback("agents", "company-1", new Error("Evo CRM não configurado"));

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[conversas page] fetchAgents failed; degrading to empty list",
      {
        companyId: "company-1",
        message: "Evo CRM não configurado",
        cause: undefined,
      },
    );
  });
});
