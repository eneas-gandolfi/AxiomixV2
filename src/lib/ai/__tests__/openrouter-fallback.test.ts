/**
 * Arquivo: src/lib/ai/__tests__/openrouter-fallback.test.ts
 * Propósito: Garantir que modelo descontinuado no OpenRouter (HTTP 404,
 *            "No endpoints found") cai imediatamente pro fallback gratuito
 *            em vez de estourar erro pro caller — incidente 2026-07-29 no
 *            /api/dashboard/next-action-suggestion.
 * Autor: AXIOMIX
 * Data: 2026-07-29
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/services/usage/log", () => ({
  logAiUsage: vi.fn().mockResolvedValue(undefined),
}));

import { openRouterChatCompletion } from "@/lib/ai/openrouter";

function okCompletion(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    { status: 200 },
  );
}

describe("openRouterChatCompletion — modelo descontinuado (404)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("cai pro fallback gratuito quando o modelo primário retorna 404", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('{"error":{"message":"No endpoints found for modelo-morto."}}', {
          status: 404,
        }),
      )
      .mockResolvedValueOnce(okCompletion('{"ok":true}'));

    const content = await openRouterChatCompletion(
      "company-404-test",
      [{ role: "user", content: "oi" }],
      { model: "vendor/modelo-morto-404-primeiro", module: "dashboard" },
    );

    expect(content).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.model).not.toBe("vendor/modelo-morto-404-primeiro");
  });

  it("remapeia modelo legado descontinuado pro sucessor atual antes de chamar a API", async () => {
    // OPENROUTER_MODEL em produção (Easypanel) ainda aponta pro modelo morto;
    // o código deve se auto-corrigir sem depender de mudança de env.
    vi.stubEnv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001");
    fetchMock.mockResolvedValueOnce(okCompletion('{"ok":true}'));

    await openRouterChatCompletion("company-remap-test", [{ role: "user", content: "oi" }], {
      module: "dashboard",
    });

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstBody.model).toBe("google/gemini-3.5-flash");
  });
});
