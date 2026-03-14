/**
 * Arquivo: src/lib/ai/prompts/competitor.ts
 * Proposito: Prompts do modulo Intelligence para analise de concorrentes e radar.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import type { CollectedPostDraft } from "@/types/modules/intelligence.types";

function serializePosts(posts: CollectedPostDraft[]) {
  return posts
    .map((post, index) => {
      const engagement = post.likesCount + post.commentsCount * 2 + post.sharesCount * 3;
      return [
        `#${index + 1}`,
        `plataforma=${post.platform}`,
        `engagement=${engagement}`,
        `likes=${post.likesCount}`,
        `comentarios=${post.commentsCount}`,
        `shares=${post.sharesCount}`,
        `texto=${post.content.slice(0, 260)}`,
      ].join(" | ");
    })
    .join("\n");
}

export function buildCompetitorInsightPrompt(
  competitorName: string,
  posts: CollectedPostDraft[]
) {
  return `
Voce e um analista de marketing competitivo.
Analise os posts do concorrente "${competitorName}" e responda APENAS JSON valido:
{
  "summary": "resumo curto em portugues",
  "top_themes": ["tema 1", "tema 2", "tema 3"],
  "recommendations": ["acao 1", "acao 2", "acao 3"]
}

Regras:
- summary com no maximo 90 palavras.
- top_themes com 2 a 5 itens curtos.
- recommendations com 2 a 5 itens praticos e acionaveis.
- sem markdown.

Posts:
${serializePosts(posts)}
`.trim();
}

export function buildRadarInsightPrompt(
  niche: string,
  subNiche: string | null,
  posts: CollectedPostDraft[]
) {
  return `
Voce e um estrategista de conteudo para pequenas e medias empresas.
Contexto de nicho: ${niche}${subNiche ? ` / ${subNiche}` : ""}.
Com base no radar abaixo, responda APENAS JSON valido:
{
  "summary": "resumo curto em portugues",
  "top_themes": ["tema 1", "tema 2", "tema 3"],
  "recommendations": ["acao 1", "acao 2", "acao 3"]
}

Regras:
- Foco em conteudo viral e aproveitamento pratico da semana.
- summary com no maximo 100 palavras.
- top_themes com 2 a 6 itens.
- recommendations com 2 a 5 itens de execucao simples.
- sem markdown.

Posts:
${serializePosts(posts)}
`.trim();
}
