import { afterEach, describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "../rate-limit";

// Testa fallback in-memory (sem UPSTASH_REDIS_REST_URL configurado)

afterEach(() => {
  vi.doUnmock("@upstash/ratelimit");
  vi.doUnmock("@upstash/redis");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("checkRateLimit (in-memory fallback)", () => {
  it("permite primeira request", async () => {
    const result = await checkRateLimit("test:unique1:" + Date.now(), 5, 60);
    expect(result.allowed).toBe(true);
  });

  it("permite requests dentro do limite", async () => {
    const key = "test:within-limit:" + Date.now();
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, 5, 60);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloqueia após exceder limite", async () => {
    const key = "test:exceed:" + Date.now();
    // Usar todo o limite
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, 3, 60);
    }
    // Próxima deve ser bloqueada
    const result = await checkRateLimit(key, 3, 60);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("usa chaves independentes", async () => {
    const key1 = "test:independent1:" + Date.now();
    const key2 = "test:independent2:" + Date.now();

    // Esgotar key1
    for (let i = 0; i < 2; i++) {
      await checkRateLimit(key1, 2, 60);
    }
    const result1 = await checkRateLimit(key1, 2, 60);
    expect(result1.allowed).toBe(false);

    // key2 deve estar livre
    const result2 = await checkRateLimit(key2, 2, 60);
    expect(result2.allowed).toBe(true);
  });
});

describe("checkRateLimit (Redis indisponivel)", () => {
  it("cai para o limite em memoria quando o Redis falha", async () => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://full-ray-85316.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    const limit = vi.fn().mockRejectedValue(new Error("redis offline"));
    const RatelimitMock = Object.assign(
      vi.fn().mockImplementation(function Ratelimit() {
        return { limit };
      }),
      { slidingWindow: vi.fn().mockReturnValue({}) }
    );

    vi.doMock("@upstash/ratelimit", () => ({ Ratelimit: RatelimitMock }));
    vi.doMock("@upstash/redis", () => ({
      Redis: vi.fn().mockImplementation(function Redis() {
        return {};
      }),
    }));

    const { checkRateLimit: checkRateLimitWithRedis } = await import("../rate-limit");
    const result = await checkRateLimitWithRedis("test:redis-down:" + Date.now(), 5, 60);

    expect(limit).toHaveBeenCalledTimes(1);
    expect(result.allowed).toBe(true);
  });
});
