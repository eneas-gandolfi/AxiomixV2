/**
 * Arquivo: src/services/rag/chunker.ts
 * Propósito: Dividir texto em chunks para indexacao vetorial (recursive character split).
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

type Chunk = {
  content: string;
  tokenCount: number;
};

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

type SplitResult = { segments: string[]; separator: string };

function splitByRecursiveSeparators(text: string): SplitResult {
  // Tenta dividir por paragrafos primeiro
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return { segments: paragraphs, separator: "\n\n" };
  }

  // Depois por sentencas
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    return { segments: sentences, separator: " " };
  }

  // Por ultimo, por espacos
  return { segments: text.split(/\s+/), separator: " " };
}

export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  const cleanedText = text
    .replace(/\r\n/g, "\n")          // normalizar line endings
    .replace(/[ \t]+/g, " ")         // colapsar espacos horizontais
    .replace(/\n{3,}/g, "\n\n")      // max 2 newlines seguidos
    .trim();
  if (cleanedText.length === 0) {
    return [];
  }

  if (cleanedText.length <= chunkSize) {
    return [{ content: cleanedText, tokenCount: estimateTokenCount(cleanedText) }];
  }

  const { segments, separator } = splitByRecursiveSeparators(cleanedText);
  const chunks: Chunk[] = [];
  let currentChunk = "";

  for (const segment of segments) {
    const candidate = currentChunk ? `${currentChunk}${separator}${segment}` : segment;

    if (candidate.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: estimateTokenCount(currentChunk.trim()),
      });

      // Overlap: pegar o final do chunk anterior
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      const overlap = currentChunk.slice(overlapStart);
      currentChunk = `${overlap}${separator}${segment}`;
    } else {
      currentChunk = candidate;
    }
  }

  // Ultimo chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: estimateTokenCount(currentChunk.trim()),
    });
  }

  return chunks;
}
