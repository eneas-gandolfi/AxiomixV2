/**
 * Arquivo: src/services/group-agent/openrouter-errors.ts
 * Propósito: Traduzir falhas do OpenRouter em respostas acionáveis no WhatsApp.
 */

export const GROUP_AGENT_GENERIC_AI_FAILURE_MESSAGE =
  "Tive uma dificuldade técnica agora. Pode tentar de novo em alguns segundos?";

export const GROUP_AGENT_OPENROUTER_CREDITS_MESSAGE =
  "Não consegui responder porque os créditos do OpenRouter acabaram. Recarregue os créditos para reativar a IA.";

type OpenRouterFallback = {
  text: string;
  statusBase: "llm_failed" | "openrouter_credits_required";
};

export function isOpenRouterCreditsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("openrouter") &&
    (
      normalized.includes("402") ||
      normalized.includes("insufficient credit") ||
      normalized.includes("insufficient credits") ||
      normalized.includes("insufficient balance") ||
      normalized.includes("not enough credit") ||
      normalized.includes("not enough credits") ||
      normalized.includes("add credits") ||
      normalized.includes("no credits") ||
      normalized.includes("out of credits")
    )
  );
}

export function buildOpenRouterFailureFallback(error: unknown): OpenRouterFallback {
  if (isOpenRouterCreditsError(error)) {
    return {
      text: GROUP_AGENT_OPENROUTER_CREDITS_MESSAGE,
      statusBase: "openrouter_credits_required",
    };
  }

  return {
    text: GROUP_AGENT_GENERIC_AI_FAILURE_MESSAGE,
    statusBase: "llm_failed",
  };
}
