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
    ? `\n\nBase de conhecimento disponivel (documentos da empresa e referencias padrao da Axiomix; use apenas quando realmente se aplicar ao caso):\n${kbContext}\n`
    : "";

  return `
Voce e um analista senior de vendas e atendimento no WhatsApp.${kbBlock}
Analise a conversa abaixo e responda SOMENTE em JSON valido com o formato:
{
  "sentiment": "positivo" | "neutro" | "negativo",
  "intent": "compra" | "suporte" | "reclamacao" | "duvida" | "cancelamento" | "outro",
  "urgency": 1 a 5,
  "sales_stage": "discovery" | "qualification" | "proposal" | "negotiation" | "closing" | "post_sale" | "unknown",
  "summary": "resumo curto em portugues",
  "implicit_need": "necessidade implicita percebida",
  "explicit_need": "necessidade explicita declarada",
  "objections": ["objecao 1", "objecao 2"],
  "key_topics": ["topico1", "topico2"],
  "next_commitment": "proximo compromisso concreto a obter",
  "stall_reason": "motivo principal da conversa travar, se houver",
  "confidence_score": 0 a 100,
  "suggested_response": "sugestao de resposta ao cliente",
  "action_items": ["acao 1", "acao 2"]
}

Regras:
- Classifique sentimento, intencao e urgencia com base no que realmente aparece na conversa.
- Se houver contexto da base de conhecimento, use-o como referencia principal para detalhes tecnicos, argumentos comerciais, gargalos do atendimento, proximos passos e criterios de aplicacao.
- Quando fizer sentido, use o contexto para identificar etapa da venda, necessidade implicita vs explicita, perguntas que faltaram e o melhor compromisso a obter do cliente.
- Ignore trechos da base que nao tenham relacao direta com a demanda do cliente.
- Nao invente medidas, estoque, prazo, garantia, instalacao, politica comercial ou promessa que nao estejam na conversa ou na base.
- Use no maximo 120 palavras no summary.
- summary: explique a necessidade do cliente, o estagio do atendimento/negociacao e o principal gargalo, risco ou oportunidade.
- sales_stage: classifique o momento da venda. Use "unknown" se nao houver sinal suficiente.
- implicit_need: necessidade percebida, mas ainda nao verbalizada claramente pelo cliente. Retorne string vazia se nao houver.
- explicit_need: necessidade declarada claramente pelo cliente. Retorne string vazia se nao houver.
- objections: liste objecoes ou travas reais percebidas na conversa. Retorne array vazio se nao houver.
- Gere de 2 a 4 action_items objetivos, praticos e executaveis pelo time no WhatsApp ou no processo comercial. Prefira acoes diagnosticas e proximos compromissos claros em vez de sugestoes genericas.
- urgency: 1=informativo, 2=baixa prioridade, 3=media, 4=alta prioridade, 5=critico/acao imediata.
- key_topics: 1 a 3 palavras-chave curtas sobre os assuntos da conversa.
- next_commitment: proximo microcompromisso concreto para mover a conversa. Retorne string vazia se nao se aplicar.
- stall_reason: descreva em 1 frase o principal motivo da conversa estar travada. Retorne string vazia se nao houver travamento.
- confidence_score: sua confianca geral na analise, de 0 a 100.
- suggested_response: sugestao objetiva de resposta (max 80 palavras), com linguagem tecnica/comercial coerente com a base. Se faltar dado tecnico, peca a informacao faltante em vez de inventar. Se a conversa ja esta resolvida, retorne string vazia.
- Nao inclua markdown.

Conversa:
${serializedMessages}
`.trim();
}
