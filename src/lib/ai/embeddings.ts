/**
 * Arquivo: src/lib/ai/embeddings.ts
 * Proposito: Gerar embeddings via OpenRouter usando text-embedding-3-small.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

async function resolveApiKey(companyId: string): Promise<string> {
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
      return decoded.apiKey;
    }
  }

  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  throw new Error("Integracao OpenRouter nao configurada para esta empresa.");
}

export async function generateEmbedding(companyId: string, text: string): Promise<number[]> {
  const apiKey = await resolveApiKey(companyId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: text,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Embedding timeout: requisicao excedeu 30s.");
    }
    throw error;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding || embedding.length !== 1536) {
    throw new Error("OpenRouter nao retornou embedding valido (esperado 1536 dims).");
  }

  return embedding;
}

export async function generateEmbeddings(
  companyId: string,
  texts: string[]
): Promise<number[][]> {
  const apiKey = await resolveApiKey(companyId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: texts,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Embedding batch timeout: requisicao excedeu 60s.");
    }
    throw error;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding batch error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const embeddings = payload.data?.map((d) => d.embedding).filter(Boolean) as number[][];

  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `Esperado ${texts.length} embeddings, recebeu ${embeddings?.length ?? 0}.`
    );
  }

  return embeddings;
}
