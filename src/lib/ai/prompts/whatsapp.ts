/**
 * Arquivo: src/lib/ai/prompts/whatsapp.ts
 * Proposito: Prompt base para analise de conversas WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type MessageInput = {
  direction: "inbound" | "outbound";
  content: string | null;
  sentAt: string;
};

export function buildWhatsAppAnalysisPrompt(messages: MessageInput[]) {
  const serializedMessages = messages
    .map((message) => {
      const side = message.direction === "inbound" ? "CLIENTE" : "ATENDIMENTO";
      return `${message.sentAt} | ${side}: ${message.content ?? ""}`;
    })
    .join("\n");

  return `
Voce e um analista de vendas e atendimento.
Analise a conversa abaixo e responda SOMENTE em JSON valido com o formato:
{
  "sentiment": "positivo" | "neutro" | "negativo",
  "intent": "compra" | "suporte" | "reclamacao" | "duvida" | "cancelamento" | "outro",
  "urgency": 1 a 5,
  "summary": "resumo curto em portugues",
  "key_topics": ["topico1", "topico2"],
  "suggested_response": "sugestao de resposta ao cliente",
  "action_items": ["acao 1", "acao 2"]
}

Regras:
- Use no maximo 120 palavras no summary.
- Gere de 1 a 4 action_items objetivos.
- urgency: 1=informativo, 2=baixa prioridade, 3=media, 4=alta prioridade, 5=critico/acao imediata.
- key_topics: 1 a 3 palavras-chave curtas sobre os assuntos da conversa.
- suggested_response: sugestao objetiva de resposta (max 60 palavras). Se a conversa ja esta resolvida, retorne string vazia.
- Nao inclua markdown.

Conversa:
${serializedMessages}
`.trim();
}
