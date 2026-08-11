import { describe, expect, it } from "vitest";
import {
  buildOpenRouterFailureFallback,
  GROUP_AGENT_OPENROUTER_CREDITS_MESSAGE,
  isOpenRouterCreditsError,
} from "@/services/group-agent/openrouter-errors";

describe("isOpenRouterCreditsError", () => {
  it("detecta erro de créditos insuficientes do OpenRouter", () => {
    expect(
      isOpenRouterCreditsError(
        new Error("OpenRouter error 402: Insufficient credits. Please add credits.")
      )
    ).toBe(true);
  });

  it("não confunde erro genérico com falta de crédito", () => {
    expect(isOpenRouterCreditsError(new Error("OpenRouter error 500: upstream timeout"))).toBe(false);
  });
});

describe("buildOpenRouterFailureFallback", () => {
  it("gera mensagem clara quando acabaram os créditos", () => {
    const fallback = buildOpenRouterFailureFallback(
      new Error("OpenRouter error 402: Your account has insufficient balance")
    );

    expect(fallback.text).toBe(GROUP_AGENT_OPENROUTER_CREDITS_MESSAGE);
    expect(fallback.statusBase).toBe("openrouter_credits_required");
  });
});
