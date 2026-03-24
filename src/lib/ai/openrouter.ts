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

export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OpenRouterMessage = {
  role: "system" | "user";
  content: string | OpenRouterContentPart[];
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
  skipFallback?: boolean;
};

type AttemptResult =
  | { ok: true; content: string }
  | { ok: false; status: number; detail: string };

/* ── Fallback para modelos gratuitos ── */

const FALLBACK_STATUS_CODES = new Set([402, 429, 500, 502, 503]);

const DEFAULT_FREE_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
];

function getFreeFallbackModels(): string[] {
  const env = process.env.OPENROUTER_FREE_MODELS?.trim();
  if (env) {
    return env.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_FREE_MODELS;
}

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

async function attemptChatCompletion(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  temperature: number,
  useJsonFormat: boolean,
): Promise<AttemptResult> {
  const body: Record<string, unknown> = { model, temperature, messages };

  if (useJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, status: 0, detail: "Timeout: requisição excedeu 60s." };
    }
    throw error;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, status: response.status, detail: detail.slice(0, 200) };
  }

  const payload = (await response.json()) as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return { ok: false, status: 0, detail: "Resposta sem conteúdo." };
  }

  return { ok: true, content };
}

export async function openRouterChatCompletion(
  companyId: string,
  messages: OpenRouterMessage[],
  options?: OpenRouterOptions
) {
  const config = await resolveOpenRouterConfig(companyId);
  const responseFormat = options?.responseFormat ?? "json";
  const temperature = options?.temperature ?? 0.2;
  const primaryModel = options?.model || config.model;
  const useJson = responseFormat === "json";

  /* ── Tentativa primária ── */
  const primary = await attemptChatCompletion(
    config.apiKey, primaryModel, messages, temperature, useJson,
  );

  if (primary.ok) {
    return primary.content;
  }

  const { status: primaryStatus, detail: primaryDetail } = primary;

  /* ── Decidir se deve tentar fallback ── */
  if (options?.skipFallback || !FALLBACK_STATUS_CODES.has(primaryStatus)) {
    throw new Error(`OpenRouter error ${primaryStatus}: ${primaryDetail}`);
  }

  console.warn(
    `[openrouter] Modelo primário "${primaryModel}" falhou (HTTP ${primaryStatus}). Iniciando fallback para modelo gratuito.`,
  );

  /* ── Fallback: tentar cada modelo gratuito ── */
  const freeModels = getFreeFallbackModels();

  for (const freeModel of freeModels) {
    const attempt = await attemptChatCompletion(
      config.apiKey, freeModel, messages, temperature, useJson,
    );

    if (attempt.ok) {
      console.warn(`[openrouter] Fallback bem-sucedido com modelo "${freeModel}".`);
      return attempt.content;
    }

    /* Se pediu JSON e falhou, tentar sem response_format (o system prompt já pede JSON) */
    if (useJson) {
      const retryNoJson = await attemptChatCompletion(
        config.apiKey, freeModel, messages, temperature, false,
      );

      if (retryNoJson.ok) {
        console.warn(
          `[openrouter] Fallback bem-sucedido com modelo "${freeModel}" (sem response_format json).`,
        );
        return retryNoJson.content;
      }
    }
  }

  /* ── Todos os fallbacks falharam ── */
  throw new Error(
    `OpenRouter error ${primaryStatus}: ${primaryDetail} (fallback com modelos gratuitos também falhou)`,
  );
}

/**
 * Transcreve áudio via OpenRouter usando Gemini Flash (aceita ogg, mp3, wav, etc.).
 * WhatsApp envia áudio em ogg/opus — gpt-4o-audio-preview não aceita ogg,
 * mas Gemini processa áudio em vários formatos via data URL.
 */
export async function openRouterAudioTranscription(
  companyId: string,
  audioBase64: string,
  mimetype: string
): Promise<string> {
  const dataUrl = `data:${mimetype};base64,${audioBase64}`;

  const transcription = await openRouterChatCompletion(
    companyId,
    [
      {
        role: "system",
        content:
          "Voce e um transcritor de audio profissional. Transcreva o audio a seguir em portugues brasileiro, " +
          "mantendo o texto fiel ao que foi dito. Retorne APENAS a transcricao, sem comentarios ou formatacao extra.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcreva este audio:" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    { responseFormat: "text", temperature: 0.1, model: "google/gemini-2.0-flash-001" }
  );

  if (!transcription || transcription.trim().length === 0) {
    throw new Error("Transcrição de áudio retornou vazia.");
  }

  return transcription.trim();
}
