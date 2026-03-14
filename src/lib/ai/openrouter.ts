/**
 * Arquivo: src/lib/ai/openrouter.ts
 * Proposito: Integrar o AXIOMIX ao OpenRouter com credenciais por company_id.
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
};

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

  throw new Error("Integracao OpenRouter nao configurada para esta empresa.");
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
    model: config.model,
    temperature,
    messages,
  };

  if (responseFormat === "json") {
    body.response_format = {
      type: "json_object",
    };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter nao retornou conteudo da resposta.");
  }

  return content;
}
