/**
 * Arquivo: src/lib/ai/prompts/daily-report.ts
 * Proposito: Prompt de geracao de relatorio diario de gargalos para WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

type DailyReportPromptInput = {
  companyName: string;
  reportDate: string;
  conversationsAnalyzed: number;
  purchaseIntents: number;
  negativeSentiments: number;
  topPurchaseContacts: string[];
  postsPublished: number;
  postsFailed: number;
  postsStuck: number;
  topViralContent: Array<{
    platform: string;
    engagementScore: number;
    content: string;
  }>;
  competitorInsightsCount: number;
  alertsSentByType: Record<string, number>;
  alertsFailed: number;
  failedJobsByType: Record<string, number>;
  knowledgeBaseContext?: string;
};

export function buildDailyReportPrompt(input: DailyReportPromptInput) {
  const contactsLine =
    input.topPurchaseContacts.length > 0
      ? input.topPurchaseContacts.join(", ")
      : "Nenhum identificado";

  const viralLines = input.topViralContent
    .map(
      (post, index) =>
        `${index + 1}. ${post.platform} | score ${post.engagementScore} | ${post.content.slice(0, 120)}`
    )
    .join("\n");

  const alertsLines = Object.entries(input.alertsSentByType)
    .map(([type, count]) => `  - ${type}: ${count}`)
    .join("\n");

  const failedJobsLines = Object.entries(input.failedJobsByType)
    .map(([type, count]) => `  - ${type}: ${count}`)
    .join("\n");

  const kbBlock = input.knowledgeBaseContext
    ? `\n\nContexto da base de conhecimento disponivel (documentos da empresa e referencias padrao da Axiomix; use para enriquecer o relatorio):\n${input.knowledgeBaseContext}\n`
    : "";

  return `
Voce e um analista operacional que gera relatorios diarios de gargalos diretos e praticos.${kbBlock}
Gere um resumo diario em portugues focado em GARGALOS e pontos que precisam de atencao IMEDIATA.
Maximo de 300 palavras. Use *bold* para destaques (formato WhatsApp). Use 3-4 emojis estrategicos.

Estrutura obrigatoria:

1. *Destaque do dia* — o ponto mais importante (positivo ou negativo)
2. ⚠️ *Gargalos detectados* — problemas que precisam de atencao (posts travados, falhas, sentimentos negativos)
3. 💡 *Acoes recomendadas* — 2-3 acoes concretas para o gestor tomar
4. 📊 *Resumo operacional* — numeros-chave do dia em formato compacto

Tom: executivo, direto, foca no que PRECISA de atencao. Se houver contexto de vendas consultivas, destaque gargalos de diagnostico, objecoes mal trabalhadas e falta de proximo compromisso claro. Se nao ha gargalos, destaque oportunidades.
Formato: texto puro com *bold* para WhatsApp. Sem markdown, sem listas com -.

Dados do dia (${input.reportDate}):
- Empresa: ${input.companyName}
- WhatsApp: ${input.conversationsAnalyzed} conversas analisadas
- Intencoes de compra: ${input.purchaseIntents} (contatos: ${contactsLine})
- Sentimentos negativos: ${input.negativeSentiments}
- Posts publicados: ${input.postsPublished}
- Posts falhados: ${input.postsFailed}
- Posts travados (scheduled ha mais de 1h): ${input.postsStuck}
- Conteudo viral do radar:
${viralLines || "Nenhum conteudo viral detectado."}
- Insights de concorrentes: ${input.competitorInsightsCount}
- Alertas enviados:
${alertsLines || "  Nenhum alerta enviado."}
- Alertas falhados: ${input.alertsFailed}
- Jobs falhados:
${failedJobsLines || "  Nenhum job falhou."}
`.trim();
}

export type { DailyReportPromptInput };
