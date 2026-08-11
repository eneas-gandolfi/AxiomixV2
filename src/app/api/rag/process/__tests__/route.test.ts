import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/rag/processor", () => ({
  runRagProcessWorker: vi.fn(),
}));

const ORIGINAL_ENV = process.env;

describe("POST /api/rag/process", () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.resetModules();
  });

  it("can be imported during build without QStash signing keys", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      QSTASH_CURRENT_SIGNING_KEY: undefined,
      QSTASH_NEXT_SIGNING_KEY: undefined,
    };

    await expect(import("../route")).resolves.toMatchObject({
      POST: expect.any(Function),
    });
  });
});
