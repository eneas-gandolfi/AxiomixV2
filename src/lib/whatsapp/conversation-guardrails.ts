type MessageLike = {
  content: string | null;
};

type ConversationSentiment = "positivo" | "neutro" | "negativo";

type ConversationGuardrailAssessment = {
  isClearlyPersonal: boolean;
  suggestedSentiment: ConversationSentiment;
  personalScore: number;
  businessScore: number;
  strongBusinessMatches: number;
};

const STRONG_PERSONAL_SIGNALS = [
  "te amo",
  "te adoro",
  "amo voce",
  "amo vc",
  "meu amor",
  "meu bem",
  "boa noite meu amor",
  "bom dia meu amor",
  "bom dia amor",
  "boa noite amor",
  "vou dormir",
  "bons sonhos",
  "saudade",
  "beijo",
  "abraco",
] as const;

const WEAK_PERSONAL_SIGNALS = [
  " amor ",
  " amor,",
  " amor.",
  "vida",
  "lindo",
  "linda",
  "querido",
  "querida",
  "moz",
  "bb",
  "bebe",
  "s2",
] as const;

const STRONG_BUSINESS_SIGNALS = [
  "produto",
  "servico",
  "atendimento",
  "orcamento",
  "proposta",
  "compr",
  "pedido",
  "entrega",
  "pagamento",
  "pix",
  "boleto",
  "nota fiscal",
  "suporte",
  "erro",
  "problema",
  "não funciona",
  "garantia",
  "instal",
  "consulta",
  "reserva",
  "agendamento",
  "cancel",
  "reclam",
  "defeito",
  "troca",
  "devolu",
  "prazo",
  "estoque",
  "cliente",
  "atendente",
  "vendedor",
  "loja",
  "empresa",
  "contrato",
  "fatura",
  "mensalidade",
  "assinatura",
  "plano",
] as const;

const WEAK_BUSINESS_SIGNALS = ["preco", "valor", "caro", "barato", "desconto"] as const;

const NEGATIVE_PERSONAL_SIGNALS = [
  "triste",
  "chatead",
  "magoad",
  "brig",
  "raiva",
  "odio",
  "termin",
  "acabou",
] as const;

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function countSignalOccurrences(text: string, signal: string) {
  let count = 0;
  let startIndex = 0;

  while (startIndex < text.length) {
    const matchIndex = text.indexOf(signal, startIndex);
    if (matchIndex === -1) {
      break;
    }

    count += 1;
    startIndex = matchIndex + signal.length;
  }

  return count;
}

function countMatches(text: string, signals: readonly string[]) {
  return signals.reduce(
    (total, signal) => total + countSignalOccurrences(text, signal),
    0
  );
}

export function assessConversationGuardrails(
  messages: MessageLike[]
): ConversationGuardrailAssessment {
  const combined = normalizeText(messages.map((message) => message.content ?? "").join(" "));
  const strongPersonalMatches = countMatches(combined, STRONG_PERSONAL_SIGNALS);
  const weakPersonalMatches = countMatches(combined, WEAK_PERSONAL_SIGNALS);
  const strongBusinessMatches = countMatches(combined, STRONG_BUSINESS_SIGNALS);
  const weakBusinessMatches = countMatches(combined, WEAK_BUSINESS_SIGNALS);
  const negativePersonalMatches = countMatches(combined, NEGATIVE_PERSONAL_SIGNALS);

  const personalScore = strongPersonalMatches * 2 + weakPersonalMatches;
  const businessScore = strongBusinessMatches * 2 + weakBusinessMatches;
  const hasPositivePersonalTone = personalScore > negativePersonalMatches;

  let suggestedSentiment: ConversationSentiment = "neutro";
  if (negativePersonalMatches > personalScore && negativePersonalMatches > 0) {
    suggestedSentiment = "negativo";
  } else if (hasPositivePersonalTone && personalScore > 0) {
    suggestedSentiment = "positivo";
  }

  const isClearlyPersonal =
    personalScore >= 3 &&
    strongBusinessMatches === 0 &&
    businessScore <= 1;

  return {
    isClearlyPersonal,
    suggestedSentiment,
    personalScore,
    businessScore,
    strongBusinessMatches,
  };
}
