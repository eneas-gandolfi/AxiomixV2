/**
 * Arquivo: src/services/rag/search.ts
 * Proposito: Busca vetorial na base de conhecimento RAG via pgvector.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { generateEmbedding } from "@/lib/ai/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RagChunkMatch } from "@/types/modules/rag.types";

type SearchOptions = {
  includeGlobal?: boolean;
  matchThreshold?: number;
  matchCount?: number;
};

export async function searchKnowledgeBase(
  companyId: string,
  query: string,
  options?: SearchOptions
): Promise<RagChunkMatch[]> {
  const includeGlobal = options?.includeGlobal ?? false;
  const matchThreshold = options?.matchThreshold ?? 0.5;
  const matchCount = options?.matchCount ?? 5;

  const queryEmbedding = await generateEmbedding(companyId, query);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("match_rag_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_company_id: companyId,
    include_global: includeGlobal,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Erro na busca vetorial: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Diagnostico: verificar se existem chunks com embedding no escopo consultado.
    let countQuery = supabase
      .from("rag_document_chunks")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null);

    if (includeGlobal) {
      countQuery = countQuery.or(`scope.eq.global,company_id.eq.${companyId}`);
    } else {
      countQuery = countQuery.eq("company_id", companyId);
    }

    const { count } = await countQuery;

    console.warn(
      `[RAG Search] 0 resultados para query "${query.slice(0, 80)}..." | ` +
      `companyId=${companyId} | includeGlobal=${includeGlobal} | threshold=${matchThreshold} | ` +
      `chunks_com_embedding=${count ?? 0}`
    );

    return [];
  }

  return (data as Array<{
    id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    similarity: number;
  }>).map((row) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
  }));
}
