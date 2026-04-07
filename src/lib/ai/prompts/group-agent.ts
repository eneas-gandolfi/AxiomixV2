/**
 * Arquivo: src/lib/ai/prompts/group-agent.ts
 * Propósito: System prompt para o agente IA no grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import type { AgentTone, GroupAgentIntent, SessionMessage } from "@/types/modules/group-agent.types";

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
  sessionHistory?: SessionMessage[];
};

const TONE_INSTRUCTIONS: Record<AgentTone, string> = {
  profissional:
    "IMPORTANTE: Adote um tom estritamente profissional e corporativo. Use linguagem formal, objetiva e direta. Evite gírias, emojis ou informalidades. Estruture suas respostas de forma clara com tópicos quando apropriado. Trate todos por 'você' de forma respeitosa.",
  casual:
    "IMPORTANTE: Adote um tom casual e amigável. Use linguagem natural, descontraída e acessível. Pode usar emojis com moderação e expressões coloquiais. Seja simpático e próximo, como um colega de trabalho conversando no café. Mantenha a precisão das informações mesmo sendo informal.",
  tecnico:
    "IMPORTANTE: Adote um tom técnico e analítico. Seja preciso, detalhado e use terminologia técnica quando relevante. Priorize dados, números e métricas. Estruture com listas e categorias. Evite linguagem vaga — prefira termos específicos e quantificáveis.",
};

const INTENT_INSTRUCTIONS: Record<GroupAgentIntent, string> = {
  summary:
    "O usuário pediu um resumo. Sintetize as mensagens recentes do grupo de forma clara, destacando os pontos principais, decisões e pendências.",
  sales_data:
    "O usuário pediu dados de vendas. Apresente métricas, números e status do pipeline de forma organizada. Use listas e destaque tendências.",
  report:
    "O usuário pediu um relatório. Gere um relatório estruturado com seções claras: visão geral, métricas, destaques e próximos passos.",
  rag_query:
    "O usuário fez uma pergunta. Consulte a base de conhecimento para responder com precisão. Cite as fontes quando possível.",
  suggestion:
    "O usuário pediu uma sugestão. Analise o contexto e ofereça recomendações práticas e acionáveis baseadas nos dados disponíveis.",
  general:
    "Responda à solicitação do usuário de forma completa e útil, usando todo o contexto disponível.",
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
1. Responda em português brasileiro, máximo 600 palavras.
2. Use formatação WhatsApp: *negrito*, _itálico_. Não use markdown com # ou [links].
3. Seja conciso e prático. Priorize informações acionáveis.
4. Se não souber a resposta, diga claramente. Nunca invente dados ou métricas.
5. Cite fontes da base de conhecimento quando usar.
6. Não repita informações que já estão visíveis no histórico do grupo.
7. Mensagens com prefixo [PDF], [ÁUDIO] ou [IMAGEM] contêm conteúdo extraído de mídia. Trate como contexto real e responda com base nesse conteúdo.
8. Para transcrições de áudio ([ÁUDIO]), responda a pergunta ou solicitação que o usuário fez no áudio.
9. Para conteúdo de PDF ([PDF]), analise o texto extraído e responda perguntas sobre o documento.
10. Para descrições de imagem ([IMAGEM]), use a descrição para responder sobre o que aparece na imagem.`);

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

  if (input.sessionHistory && input.sessionHistory.length > 0) {
    const historyLines = input.sessionHistory.map((m) => {
      const label = m.role === "user" ? input.senderName : input.agentName;
      return `${label}: ${m.content}`;
    });
    sections.push(
      `## Histórico da conversa com este usuário\nUse este histórico para manter coerência. Se o usuário referencia algo anterior, consulte o histórico.\n${historyLines.join("\n")}`
    );
  }

  return sections.join("\n\n");
}

export function buildGroupAgentUserPrompt(
  senderName: string,
  triggerMessage: string
): string {
  return `Pergunta de ${senderName}:\n${triggerMessage}`;
}
