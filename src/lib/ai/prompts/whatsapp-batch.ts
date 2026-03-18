/**
 * Arquivo: src/lib/ai/prompts/whatsapp-batch.ts
 * Propósito: Prompt para análise batch de múltiplas conversas WhatsApp em uma única chamada.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

type BatchMessage = {
  direction: "inbound" | "outbound";
  content: string;
  sentAt: string;
};

type BatchConversation = {
  conversationId: string;
  contactName: string;
  messages: BatchMessage[];
};

type BatchAnalysisPromptInput = {
  conversations: BatchConversation[];
  knowledgeBaseContext?: string;
};

export function buildBatchAnalysisPrompt(input: BatchAnalysisPromptInput) {
  const kbBlock = input.knowledgeBaseContext
    ? `\n\nBase de conhecimento disponível (documentos da empresa e referências padrão da Axiomix; use apenas quando realmente se aplicar):\n${input.knowledgeBaseContext}\n`
    : "";

  const conversationBlocks = input.conversations
    .map((conv, index) => {
      const messagesText = conv.messages
        .map((msg) => {
          const side = msg.direction === "inbound" ? "CLIENTE" : "ATENDIMENTO";
          const time = msg.sentAt.slice(11, 16);
          return `${time} | ${side}: ${msg.content}`;
        })
        .join("\n");

      return `=== CONVERSA #${index + 1} (id: ${conv.conversationId}, contato: ${conv.contactName}) ===\n${messagesText}`;
    })
    .join("\n\n");

  return `
Você é um analista sênior de vendas e atendimento no WhatsApp.${kbBlock}
Classifique rapidamente CADA conversa abaixo e gere um resumo geral.
Responda SOMENTE em JSON válido com o formato:

{
  "analyses": [
    {
      "conversationId": "uuid da conversa",
      "sentiment": "positivo" | "neutro" | "negativo",
      "intent": "compra" | "suporte" | "reclamação" | "dúvida" | "cancelamento" | "outro",
      "urgency": 1 a 5,
      "key_topics": ["tópico1", "tópico2"]
    }
  ],
  "summary": "Resumo geral em 2-3 frases sobre o panorama das conversas."
}

Regras:
- Retorne exatamente 1 item em "analyses" para cada conversa listada, na mesma ordem.
- Use o conversationId exato de cada conversa no retorno.
- sentiment: positivo/neutro/negativo com base no tom do cliente.
- intent: classifique a intenção principal do cliente.
- urgency: 1=informativo, 2=baixa, 3=média, 4=alta, 5=crítico.
- key_topics: 1 a 3 palavras-chave curtas.
- summary: visão geral de todas as conversas (tendências, gargalos, oportunidades). Max 3 frases.
- Se houver contexto da base de conhecimento, use-o para identificar etapa da venda e gargalos.
- Não inclua markdown.

${conversationBlocks}
`.trim();
}

export type { BatchConversation, BatchMessage, BatchAnalysisPromptInput };
