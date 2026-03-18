/**
 * Arquivo: src/services/rag/kb-context.ts
 * Proposito: Helper compartilhado para buscar contexto da base de conhecimento RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import "server-only";

import { searchKnowledgeBase } from "@/services/rag/search";

type KbContextOptions = {
  includeGlobal?: boolean;
  matchCount?: number;
  matchThreshold?: number;
  maxChars?: number;
};

/**
 * Busca contexto relevante da base de conhecimento para uso em agentes IA.
 * Nunca lanca excecao — retorna "" em caso de falha para que os agentes
 * sempre funcionem, mesmo sem KB configurada.
 */
export async function getKnowledgeBaseContext(
  companyId: string,
  searchQuery: string,
  options?: KbContextOptions
): Promise<string> {
  const includeGlobal = options?.includeGlobal ?? false;
  const matchCount = options?.matchCount ?? 3;
  const matchThreshold = options?.matchThreshold ?? 0.45;
  const maxChars = options?.maxChars ?? 3000;

  try {
    const chunks = await searchKnowledgeBase(companyId, searchQuery, {
      includeGlobal,
      matchCount,
      matchThreshold,
    });

    if (chunks.length === 0) {
      return "";
    }

    const joined = chunks.map((c) => c.content).join("\n---\n");
    return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
  } catch {
    return "";
  }
}
