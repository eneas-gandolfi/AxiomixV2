/**
 * Testes da F3 revisada (jul/2026): fim das chamadas automáticas de LLM.
 *   - runHeartbeat NÃO enfileira análises automáticas nem syncs
 *   - getWhatsappAiMode default é "local" (inclusive sem config/erro)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/jobs/queue", () => ({
  recoverAllStaleJobs: vi.fn().mockResolvedValue(2),
  markAllStaleJobsFailed: vi.fn().mockResolvedValue(1),
  enqueueJob: vi.fn(),
}));

vi.mock("@/services/usage/aggregate", () => ({
  aggregateUsageForDate: vi.fn().mockResolvedValue(0),
}));

const maybeSingleMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: maybeSingleMock,
          }),
        }),
      }),
    }),
  }),
}));

import { runHeartbeat } from "@/lib/cron/heartbeat";
import { getWhatsappAiMode } from "@/lib/whatsapp/ai-mode";
import { enqueueJob } from "@/lib/jobs/queue";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runHeartbeat (F3)", () => {
  it("faz só housekeeping — nenhum job de análise ou sync enfileirado", async () => {
    const result = await runHeartbeat();
    expect(result.recovered).toBe(2);
    expect(result.staleMarkedFailed).toBe(1);
    expect(enqueueJob).not.toHaveBeenCalled();
    // O shape não expõe mais autoAnalyses/synced — quem depender disso quebra
    // em compile-time, mas garantimos em runtime também.
    expect(result).not.toHaveProperty("autoAnalyses");
    expect(result).not.toHaveProperty("synced");
  });
});

describe("getWhatsappAiMode", () => {
  it("default 'local' quando não há integração", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    await expect(getWhatsappAiMode("c-1")).resolves.toBe("local");
  });

  it("lê aiMode da config quando presente", async () => {
    // Config como gravada no banco (snake_case, via encodeIntegrationConfig)
    maybeSingleMock.mockResolvedValue({
      data: {
        config: {
          base_url: "https://api.example.com",
          api_token: "token-x",
          ai_mode: "evo_delegated",
        },
      },
    });
    await expect(getWhatsappAiMode("c-1")).resolves.toBe("evo_delegated");
  });

  it("default 'local' quando a leitura falha", async () => {
    maybeSingleMock.mockRejectedValue(new Error("db down"));
    await expect(getWhatsappAiMode("c-1")).resolves.toBe("local");
  });
});
