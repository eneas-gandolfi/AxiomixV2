/**
 * Arquivo: src/lib/ai/prompts/group-agent.ts
 * Propósito: System prompt para o agente IA no grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import type { AgentTone, GroupAgentIntent } from "@/types/modules/group-agent.types";

type GroupAgentPromptInput = {
  agentName: string;
  agentTone: AgentTone;
  groupName: string;
  triggerMessage: string;
  senderName: string;
  intent: GroupAgentIntent;
  recentMessages: Array<{
    senderName: string;
    content: string;
    sentAt: string;
  }>;
  knowledgeBaseContext: string;
  salesDataContext: string;
};

const TONE_INSTRUCTIONS: Record<AgentTone, string> = {
  profissional:
    "Mantenha um tom profissional e objetivo. Use linguagem corporativa clara e direta.",
  casual:
    "Seja amigável e acessível. Use linguagem natural e descontraída, mas sem perder a precisão.",
  tecnico:
    "Seja preciso e detalhado. Use terminologia técnica quando relevante, com dados e números.",
};

const INTENT_INSTRUCTIONS: Record<GroupAgentIntent, string> = {
  summary:
    "O usuario pediu um resumo. Sintetize as mensagens recentes do grupo de forma clara, destacando os pontos principais, decisoes e pendencias.",
  sales_data:
    "O usuario pediu dados de vendas. Apresente metricas, numeros e status do pipeline de forma organizada. Use listas e destaque tendencias.",
  report:
    "O usuario pediu um relatorio. Gere um relatorio estruturado com secoes claras: visao geral, metricas, destaques e proximos passos.",
  rag_query:
    "O usuario fez uma pergunta. Consulte a base de conhecimento para responder com precisao. Cite as fontes quando possivel.",
  suggestion:
    "O usuario pediu uma sugestao. Analise o contexto e ofereca recomendacoes praticas e acionaveis baseadas nos dados disponiveis.",
  general:
    "Responda a solicitacao do usuario de forma completa e util, usando todo o contexto disponivel.",
};

function formatRecentMessages(
  messages: GroupAgentPromptInput["recentMessages"]
): string {
  if (messages.length === 0) return "(Sem mensagens recentes)";

  return messages
    .slice(0, 30)
    .map((m) => {
      const time = new Date(m.sentAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${m.senderName} (${time}): ${m.content}`;
    })
    .join("\n");
}

export function buildGroupAgentSystemPrompt(
  input: GroupAgentPromptInput
): string {
  const sections: string[] = [];

  sections.push(
    `Voce e ${input.agentName}, assistente de IA do grupo WhatsApp "${input.groupName}".`
  );
  sections.push(TONE_INSTRUCTIONS[input.agentTone]);

  sections.push(`## Regras
1. Responda em portugues brasileiro, maximo 600 palavras.
2. Use formatacao WhatsApp: *negrito*, _italico_. Nao use markdown com # ou [links].
3. Seja conciso e pratico. Priorize informacoes acionaveis.
4. Se nao souber a resposta, diga claramente. Nunca invente dados ou metricas.
5. Cite fontes da base de conhecimento quando usar.
6. Nao repita informacoes que ja estao visiveis no historico do grupo.`);

  sections.push(INTENT_INSTRUCTIONS[input.intent]);

  sections.push(
    `## Contexto recente do grupo\n${formatRecentMessages(input.recentMessages)}`
  );

  if (input.knowledgeBaseContext) {
    sections.push(
      `## Base de conhecimento\n${input.knowledgeBaseContext}`
    );
  }

  if (input.salesDataContext) {
    sections.push(`## Dados de vendas\n${input.salesDataContext}`);
  }

  return sections.join("\n\n");
}

export function buildGroupAgentUserPrompt(
  senderName: string,
  triggerMessage: string
): string {
  return `Pergunta de ${senderName}:\n${triggerMessage}`;
}
