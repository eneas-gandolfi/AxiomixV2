import { afterEach, describe, expect, it, vi } from "vitest";

describe("checkRateLimit (redis failure fallback)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("falls back to in-memory rate limit when Redis fetch fails", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.doMock("@upstash/redis", () => ({
      Redis: vi.fn(),
    }));

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class MockRatelimit {
        static slidingWindow() {
          return {};
        }

        async limit() {
          throw new TypeError("fetch failed");
        }
      },
    }));

    const { checkRateLimit } = await import("../rate-limit");
    const result = await checkRateLimit("login:test:redis-down", 5, 60);

    expect(result.allowed).toBe(true);
  });
});
