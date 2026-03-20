/**
 * Arquivo: src/lib/ai/prompts/weekly-report.ts
 * Propósito: Prompt de geracao de relatorio executivo semanal para WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type WeeklyReportPromptInput = {
  companyName: string;
  weekStartIso: string;
  weekEndIso: string;
  conversationsAnalyzed: number;
  activeConversations: number;
  salesOpportunities: number;
  negativeSentiments: number;
  topPurchaseContacts: string[];
  digestSummaries: string[];
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

  const purchaseContactsLine =
    input.topPurchaseContacts.length > 0
      ? input.topPurchaseContacts.join(", ")
      : "Nenhum identificado";

  const digestBlock =
    input.digestSummaries.length > 0
      ? input.digestSummaries.map((s, i) => `  Batch ${i + 1}: ${s}`).join("\n")
      : "  Sem resumos de batch no período.";

  return `
Voce e um analista de marketing e vendas que gera relatorios semanais diretos, interpretando os numeros e sugerindo acoes concretas.${kbBlock}

Gere um relatorio semanal em portugues simples. Maximo de 500 palavras.
Use formatacao WhatsApp: *negrito* para destaques. Sem markdown, sem emojis excessivos.

Estrutura obrigatoria:

1. *Resumo da semana* (2-3 frases interpretando os dados — nao apenas repita os numeros, explique o que significam para o negocio)

2. *WhatsApp*
   - Conversas ativas (com mensagens na semana): ${input.activeConversations}
   - Conversas analisadas pela IA: ${input.conversationsAnalyzed}
   - Oportunidades de venda identificadas: ${input.salesOpportunities}
   - Sentimentos negativos detectados: ${input.negativeSentiments}
   - Contatos com intencao de compra: ${purchaseContactsLine}
   Interprete: se houver sentimentos negativos, alerte. Se houver contatos com intencao de compra, destaque-os pelo nome.

3. *Redes sociais*: ${input.postsPublished} posts publicados. ${input.socialPerformanceSummary}
   Top posts do radar:
${radarLines || "   Sem posts virais registrados no periodo."}

4. *Concorrentes*: ${input.competitorSummary}

5. *Acoes recomendadas* (2-3 acoes concretas, cada uma com: o que fazer, por que, prazo sugerido)
   Priorize acoes baseadas nos dados — ex: se ha contatos com intencao de compra, sugira followup imediato com nomes.

Resumos dos batches de analise da semana:
${digestBlock}

Tom: direto, como um socio informando o dono do negocio. Foque no que exige atencao imediata.

Dados da empresa:
- Empresa: ${input.companyName}
- Periodo: ${input.weekStartIso} ate ${input.weekEndIso}
`.trim();
}
