/**
 * Arquivo: src/lib/ai/prompts/whatsapp.ts
 * Propósito: Prompt base para análise de conversas WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

type MessageInput = {
  direction: "inbound" | "outbound";
  content: string | null;
  sentAt: string;
};

type PromptOptions = {
  messages: MessageInput[];
  knowledgeBaseContext?: string;
};

export function buildWhatsAppAnalysisPrompt(input: MessageInput[] | PromptOptions) {
  const messages = Array.isArray(input) ? input : input.messages;
  const kbContext = Array.isArray(input) ? undefined : input.knowledgeBaseContext;

  const serializedMessages = messages
    .map((message) => {
      const side = message.direction === "inbound" ? "CLIENTE" : "ATENDIMENTO";
      return `${message.sentAt} | ${side}: ${message.content ?? ""}`;
    })
    .join("\n");

  const kbBlock = kbContext
    ? `\n\nBase de conhecimento disponível (documentos da empresa e referências padrão da Axiomix; use apenas quando realmente se aplicar ao caso):\n${kbContext}\n`
    : "";

  return `
Você é um analista sênior de vendas e atendimento no WhatsApp.${kbBlock}
Analise a conversa abaixo e responda SOMENTE em JSON válido com o formato:
{
  "sentiment": "positivo" | "neutro" | "negativo",
  "intent": "compra" | "suporte" | "reclamação" | "dúvida" | "cancelamento" | "outro",
  "urgency": 1 a 5,
  "sales_stage": "discovery" | "qualification" | "proposal" | "negotiation" | "closing" | "post_sale" | "unknown",
  "summary": "resumo curto em português",
  "implicit_need": "necessidade implícita percebida",
  "explicit_need": "necessidade explícita declarada",
  "objections": ["objeção 1", "objeção 2"],
  "key_topics": ["tópico1", "tópico2"],
  "next_commitment": "próximo compromisso concreto a obter",
  "stall_reason": "motivo principal da conversa travar, se houver",
  "confidence_score": 0 a 100,
  "suggested_response": "sugestão de resposta ao cliente",
  "action_items": ["ação 1", "ação 2"]
}

Regras:
- IMPORTANTE: Se a conversa for claramente pessoal ou informal (saudações afetivas, declarações de amor, conversas entre amigos/família/casal, despedidas carinhosas, sem qualquer menção a produtos, serviços, preços, problemas técnicos ou atendimento comercial), classifique como: sentiment="positivo" (ou o sentimento real da conversa), intent="outro", urgency=1, sales_stage="unknown", confidence_score alto. Não force classificação comercial em conversas que não são de negócio.
- Classifique sentimento, intenção e urgência com base no que realmente aparece na conversa.
- Se houver contexto da base de conhecimento, use-o como referência principal para detalhes técnicos, argumentos comerciais, gargalos do atendimento, próximos passos e critérios de aplicação.
- Quando fizer sentido, use o contexto para identificar etapa da venda, necessidade implícita vs explícita, perguntas que faltaram e o melhor compromisso a obter do cliente.
- Ignore trechos da base que não tenham relação direta com a demanda do cliente.
- Não invente medidas, estoque, prazo, garantia, instalação, política comercial ou promessa que não estejam na conversa ou na base.
- Use no máximo 120 palavras no summary.
- summary: explique a necessidade do cliente, o estágio do atendimento/negociação e o principal gargalo, risco ou oportunidade.
- sales_stage: classifique o momento da venda. Use "unknown" se não houver sinal suficiente.
- implicit_need: necessidade percebida, mas ainda não verbalizada claramente pelo cliente. Retorne string vazia se não houver.
- explicit_need: necessidade declarada claramente pelo cliente. Retorne string vazia se não houver.
- objections: liste objeções ou travas reais percebidas na conversa. Retorne array vazio se não houver.
- Gere de 2 a 4 action_items objetivos, práticos e executáveis pelo time no WhatsApp ou no processo comercial. Prefira ações diagnósticas e próximos compromissos claros em vez de sugestões genéricas.
- urgency: 1=informativo, 2=baixa prioridade, 3=média, 4=alta prioridade, 5=crítico/ação imediata.
- key_topics: 1 a 3 palavras-chave curtas sobre os assuntos da conversa.
- next_commitment: próximo microcompromisso concreto para mover a conversa. Retorne string vazia se não se aplicar.
- stall_reason: descreva em 1 frase o principal motivo da conversa estar travada. Retorne string vazia se não houver travamento.
- confidence_score: sua confiança geral na análise, de 0 a 100.
- suggested_response: sugestão objetiva de resposta (max 80 palavras), com linguagem técnica/comercial coerente com a base. Se faltar dado técnico, peça a informação faltante em vez de inventar. Se a conversa já está resolvida, retorne string vazia.
- Não inclua markdown.

Conversa:
${serializedMessages}
`.trim();
}
