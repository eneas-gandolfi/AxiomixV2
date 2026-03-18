/**
 * Arquivo: src/types/modules/rag.types.ts
 * Proposito: Tipos do modulo RAG (Retrieval-Augmented Generation).
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

export type RagDocumentStatus = "pending" | "processing" | "ready" | "failed";

export type RagDocument = {
  id: string;
  companyId: string | null;
  scope: "company" | "global";
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  sourceKey?: string | null;
  status: RagDocumentStatus;
  totalChunks: number;
  errorMessage: string | null;
  createdAt: string;
};

export type RagChunkMatch = {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
};
