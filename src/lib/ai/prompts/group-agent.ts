/**
 * Arquivo: src/lib/ai/prompts/group-agent.ts
 * Propósito: System prompt para o agente IA no grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import type { AgentNote, AgentTone, GroupAgentIntent, SessionMessage } from "@/types/modules/group-agent.types";

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
  agentNotes?: AgentNote[];
};

const TONE_INSTRUCTIONS: Record<AgentTone, string> = {
  profissional:
    "Tom: direto, objetivo e profissional. Sem formalidades excessivas — nada de 'Prezados', 'Atenciosamente', 'Estou à disposição' ou fórmulas corporativas. Fale como um analista competente que vai direto ao ponto.",
  casual:
    "Tom: casual e amigável. Linguagem natural, descontraída. Pode usar emojis com moderação. Seja simpático e próximo, como um colega de trabalho. Mantenha precisão mesmo sendo informal.",
  tecnico:
    "Tom: técnico e analítico. Preciso, com dados e métricas. Use listas numeradas. Evite linguagem vaga — prefira termos específicos e quantificáveis.",
};

const INTENT_INSTRUCTIONS: Record<GroupAgentIntent, string> = {
  summary:
    "O usuário pediu um resumo. Sintetize as mensagens recentes de forma clara e curta. Destaque: decisões tomadas, pendências abertas, pontos de atenção. Sem enrolação.",
  sales_data:
    "O usuário pediu dados de vendas. Apresente métricas e números de forma organizada. SEMPRE cite os leads por nome quando disponível — nunca fale genericamente. Ex: 'João (conversa #1234) está em negociação, sentimento positivo'.",
  report:
    "O usuário pediu um relatório. Seja compacto e acionável. Estrutura: 1) Números-chave, 2) Destaques (positivos e negativos), 3) Ações recomendadas. Cite nomes de leads e conversas específicas.",
  rag_query:
    "O usuário fez uma pergunta. Responda com precisão usando a base de conhecimento. Cite fontes quando possível. Se não souber, diga claramente.",
  suggestion:
    "O usuário pediu sugestões. Seja ESPECÍFICO e ACIONÁVEL. Quando sugerir reaproximação de leads, SEMPRE:\n- Cite o lead por nome\n- Explique o contexto (último contato, sentimento, estágio)\n- Dê um template de mensagem pronto para copiar e enviar\nExemplo: '*João Silva* — último contato há 3 dias, sentimento positivo, fase de negociação. Sugestão de mensagem: \"Oi João, tudo bem? Vi que ficou interessado no [produto]. Temos uma condição especial essa semana, posso te contar?\"'",
  greeting:
    "O usuário apenas ativou o agente sem fazer uma pergunta específica. Responda de forma curta e útil, mostrando o que você pode fazer. Máximo 3 linhas.",
  general:
    "Responda de forma direta e útil. Use todo o contexto disponível. Cite nomes e dados específicos sempre que possível.",
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

  sections.push(`## Regras obrigatórias
1. Português brasileiro, máximo 300 palavras. Seja CONCISO — no WhatsApp, menos é mais.
2. Formatação WhatsApp: *negrito*, _itálico_. Não use markdown com # ou [links].
3. Comece respondendo a pergunta na primeira frase. Não faça introduções.
4. PROIBIDO: "Prezados", "Atenciosamente", "Estou à disposição", "Caso necessite", "Fique à vontade". Essas expressões NUNCA devem aparecer.
5. Se não souber a resposta, diga "Não tenho essa informação" — nunca invente dados.
6. Quando tiver dados de leads/conversas, SEMPRE cite nomes e números específicos. Nunca fale genericamente como "alguns leads mostraram interesse".
7. Quando sugerir ações de vendas, inclua templates de mensagem prontos para copiar e enviar ao cliente.
8. Mensagens com [PDF], [ÁUDIO] ou [IMAGEM] contêm conteúdo JÁ EXTRAÍDO. Analise imediatamente — NUNCA diga "vou analisar depois" ou "assim que receber".
9. Para [ÁUDIO]: responda à pergunta feita no áudio.
10. Para [PDF]: analise o texto e responda sobre o documento.
11. Para [IMAGEM]: use a descrição para responder.
12. Cite fontes da base de conhecimento quando usar.
13. Não repita informações já visíveis no histórico do grupo.`);

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

  if (input.agentNotes && input.agentNotes.length > 0) {
    const categoryLabels: Record<string, string> = {
      fact: "Fato",
      preference: "Preferência",
      decision: "Decisão",
      action_item: "Pendência",
      contact_info: "Contato",
    };
    const noteLines = input.agentNotes.map((n) => {
      const label = categoryLabels[n.category] ?? n.category;
      const sender = n.source_sender ? ` (de ${n.source_sender})` : "";
      return `- [${label}]${sender} ${n.content}`;
    });
    sections.push(
      `## Sua memória (notas salvas)\nUse para dar respostas mais contextualizadas. Ignore se parecer desatualizado.\n${noteLines.join("\n")}`
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
