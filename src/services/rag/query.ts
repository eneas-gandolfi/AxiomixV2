/**
 * Arquivo: src/services/rag/query.ts
 * Proposito: Orquestrar query RAG — busca vetorial + LLM para responder perguntas.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { buildRagQueryPrompt } from "@/lib/ai/prompts/rag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { searchKnowledgeBase } from "@/services/rag/search";
import type { RagChunkMatch } from "@/types/modules/rag.types";

type QueryResult = {
  answer: string;
  sources: RagChunkMatch[];
};

const PRIMARY_MATCH_THRESHOLD = 0.5;
const RELAXED_MATCH_THRESHOLD = 0.3;
const PRIMARY_MATCH_COUNT = 5;
const RELAXED_MATCH_COUNT = 8;
const SINGLE_DOCUMENT_FALLBACK_CHUNKS = 8;

async function loadSingleDocumentFallback(
  companyId: string,
  includeGlobal: boolean
): Promise<RagChunkMatch[]> {
  const supabase = createSupabaseAdminClient();
  let documentsQuery = supabase
    .from("rag_documents")
    .select("id")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(2);

  if (includeGlobal) {
    documentsQuery = documentsQuery.or(`scope.eq.global,company_id.eq.${companyId}`);
  } else {
    documentsQuery = documentsQuery.eq("company_id", companyId);
  }

  const { data: documents, error: documentsError } = await documentsQuery;

  if (documentsError || !documents || documents.length !== 1) {
    return [];
  }

  const { data: chunks, error: chunksError } = await supabase
    .from("rag_document_chunks")
    .select("id, document_id, content, chunk_index")
    .eq("company_id", companyId)
    .eq("document_id", documents[0].id)
    .order("chunk_index", { ascending: true })
    .limit(SINGLE_DOCUMENT_FALLBACK_CHUNKS);

  if (chunksError || !chunks?.length) {
    return [];
  }

  return chunks.map((chunk) => ({
    id: chunk.id,
    documentId: chunk.document_id,
    content: chunk.content,
    chunkIndex: chunk.chunk_index,
    similarity: 0,
  }));
}

async function findRelevantChunks(
  companyId: string,
  question: string
): Promise<RagChunkMatch[]> {
  const primary = await searchKnowledgeBase(companyId, question, {
    includeGlobal: true,
    matchThreshold: PRIMARY_MATCH_THRESHOLD,
    matchCount: PRIMARY_MATCH_COUNT,
  });

  if (primary.length > 0) {
    return primary;
  }

  const relaxed = await searchKnowledgeBase(companyId, question, {
    includeGlobal: true,
    matchThreshold: RELAXED_MATCH_THRESHOLD,
    matchCount: RELAXED_MATCH_COUNT,
  });

  if (relaxed.length > 0) {
    return relaxed;
  }

  return loadSingleDocumentFallback(companyId, true);
}

export async function queryKnowledgeBase(
  companyId: string,
  question: string
): Promise<QueryResult> {
  // 1. Buscar chunks relevantes
  const chunks = await findRelevantChunks(companyId, question);

  if (chunks.length === 0) {
    return {
      answer: "Nao encontrei informacoes relevantes nos documentos disponíveis para responder essa pergunta.",
      sources: [],
    };
  }

  // 2. Buscar nomes dos documentos para contexto
  const supabase = createSupabaseAdminClient();
  const documentIds = [...new Set(chunks.map((c) => c.documentId))];
  const { data: docs } = await supabase
    .from("rag_documents")
    .select("id, file_name")
    .in("id", documentIds);

  const docNameMap = new Map(docs?.map((d) => [d.id, d.file_name]) ?? []);

  // 3. Montar prompt com contexto
  const contexts = chunks.map((chunk) => ({
    content: chunk.content,
    fileName: docNameMap.get(chunk.documentId) ?? "Documento desconhecido",
    chunkIndex: chunk.chunkIndex,
  }));

  const prompt = buildRagQueryPrompt({ question, contexts });

  // 4. Enviar ao LLM
  const answer = await openRouterChatCompletion(
    companyId,
    [{ role: "user", content: prompt }],
    { responseFormat: "text", temperature: 0.3 }
  );

  return { answer, sources: chunks };
}
