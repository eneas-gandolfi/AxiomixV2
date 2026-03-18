/**
 * Arquivo: src/lib/ai/prompts/rag.ts
 * Propósito: Prompt do sistema para queries RAG com contexto documental.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

type RagPromptInput = {
  question: string;
  contexts: Array<{
    content: string;
    fileName: string;
    chunkIndex: number;
  }>;
};

export function buildRagQueryPrompt(input: RagPromptInput): string {
  const contextBlocks = input.contexts
    .map(
      (ctx, i) =>
        `[Fonte ${i + 1} — ${ctx.fileName}, trecho ${ctx.chunkIndex}]\n${ctx.content}`
    )
    .join("\n\n---\n\n");

  return `
Você é um assistente de conhecimento da empresa. Sua função é responder perguntas com base EXCLUSIVAMENTE nos trechos de documentos fornecidos abaixo.

## Regras

1. Responda APENAS com base nas informações presentes nos trechos abaixo.
2. Se a resposta não estiver nos trechos, diga claramente: "Não encontrei essa informação nos documentos disponíveis."
3. Cite as fontes utilizadas ao final da resposta (ex: "[Fonte 1]").
4. Responda em português brasileiro, de forma clara e objetiva.
5. Não invente informações nem extrapole além do que os documentos dizem.

## Trechos de documentos

${contextBlocks}

## Pergunta do usuário

${input.question}
`.trim();
}
