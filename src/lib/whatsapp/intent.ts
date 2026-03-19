export const conversationIntentValues = [
  "compra",
  "suporte",
  "reclamacao",
  "duvida",
  "cancelamento",
  "outro",
] as const;

export type ConversationIntent = (typeof conversationIntentValues)[number];

const intentAliasMap: Record<string, ConversationIntent> = {
  compra: "compra",
  suporte: "suporte",
  reclamacao: "reclamacao",
  duvida: "duvida",
  cancelamento: "cancelamento",
  outro: "outro",
};

function canonicalizeIntent(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeConversationIntent(value?: string | null): ConversationIntent | undefined {
  if (!value) {
    return undefined;
  }

  return intentAliasMap[canonicalizeIntent(value)];
}

export function formatConversationIntentLabel(value?: string | null) {
  switch (normalizeConversationIntent(value)) {
    case "compra":
      return "Compra";
    case "suporte":
      return "Suporte";
    case "reclamacao":
      return "Reclamação";
    case "duvida":
      return "Dúvida";
    case "cancelamento":
      return "Cancelamento";
    case "outro":
      return "Outro";
    default:
      return value?.trim() || "";
  }
}
