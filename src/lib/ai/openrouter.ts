/**
 * Arquivo: src/lib/ai/openrouter.ts
 * Propósito: Integrar o AXIOMIX ao OpenRouter com credenciais por company_id.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OpenRouterConfig = {
  apiKey: string;
  model: string;
};

type OpenRouterMessage = {
  role: "system" | "user";
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OpenRouterOptions = {
  responseFormat?: "json" | "text";
  temperature?: number;
  model?: string;
};

function resolveOpenRouterEnvConfig(): OpenRouterConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o",
  };
}

async function resolveOpenRouterConfig(companyId: string): Promise<OpenRouterConfig> {
  const supabase = createSupabaseAdminClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "openrouter")
    .maybeSingle();

  if (integration?.config) {
    const decoded = decodeIntegrationConfig("openrouter", integration.config);
    if (decoded.apiKey) {
      return {
        apiKey: decoded.apiKey,
        model: decoded.model || process.env.OPENROUTER_MODEL || "openai/gpt-4o",
      };
    }
  }

  const envFallback = resolveOpenRouterEnvConfig();
  if (envFallback) {
    return envFallback;
  }

  throw new Error("Integração OpenRouter não configurada para esta empresa.");
}

export async function openRouterChatCompletion(
  companyId: string,
  messages: OpenRouterMessage[],
  options?: OpenRouterOptions
) {
  const config = await resolveOpenRouterConfig(companyId);
  const responseFormat = options?.responseFormat ?? "json";
  const temperature = options?.temperature ?? 0.2;
  const body: Record<string, unknown> = {
    model: options?.model || config.model,
    temperature,
    messages,
  };

  if (responseFormat === "json") {
    body.response_format = {
      type: "json_object",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenRouter timeout: requisição excedeu 60s.");
    }
    throw error;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter não retornou conteúdo da resposta.");
  }

  return content;
}
