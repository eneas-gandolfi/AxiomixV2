/**
 * Arquivo: src/lib/ai/prompts/weekly-report.ts
 * Proposito: Prompt de geracao de relatorio executivo semanal para WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type WeeklyReportPromptInput = {
  companyName: string;
  weekStartIso: string;
  weekEndIso: string;
  conversationsAnalyzed: number;
  salesOpportunities: number;
  postsPublished: number;
  socialPerformanceSummary: string;
  topRadarPosts: Array<{
    platform: string;
    engagementScore: number;
    content: string;
  }>;
  competitorSummary: string;
  knowledgeBaseContext?: string;
};

export function buildWeeklyReportPrompt(input: WeeklyReportPromptInput) {
  const radarLines = input.topRadarPosts
    .map(
      (post, index) =>
        `${index + 1}. ${post.platform} | score ${post.engagementScore} | ${post.content.slice(0, 140)}`
    )
    .join("\n");

  const kbBlock = input.knowledgeBaseContext
    ? `\n\nContexto da base de conhecimento da empresa (use para enriquecer o relatorio):\n${input.knowledgeBaseContext}\n`
    : "";

  return `
Voce e um analista de marketing que faz resumos executivos diretos e praticos.${kbBlock}
Gere um resumo da semana em portugues simples, sem jargoes.
Maximo de 400 palavras. Estrutura:

1. Destaque da semana (1 paragrafo)
2. WhatsApp: X conversas analisadas, Y oportunidades de venda identificadas
3. Redes sociais: posts publicados, qual teve melhor resultado
4. Concorrentes: o que estao fazendo que merece atencao
5. 1 acao recomendada para esta semana

Tom: direto, como um socio informando o dono do negocio.
Sem asteriscos, sem markdown, sem emojis excessivos.

Dados da empresa:
- Empresa: ${input.companyName}
- Periodo: ${input.weekStartIso} ate ${input.weekEndIso}
- Conversas analisadas: ${input.conversationsAnalyzed}
- Oportunidades de venda: ${input.salesOpportunities}
- Posts publicados: ${input.postsPublished}
- Resumo de performance social: ${input.socialPerformanceSummary}
- Top 3 posts virais do radar:
${radarLines || "Sem posts virais registrados no periodo."}
- Resumo dos concorrentes: ${input.competitorSummary}
`.trim();
}
