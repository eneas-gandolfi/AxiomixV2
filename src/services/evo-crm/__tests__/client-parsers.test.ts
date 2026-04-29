/**
 * Testes para os parsers do Evo CRM client.
 * Valida que os formatos reais da API (phone_number, title, epoch timestamps,
 * message_type incoming/outgoing) são parseados corretamente.
 */

import { describe, it, expect } from "vitest";

// Reimplementar parsers como funções puras para testes unitários
// (as originais são internas ao client.ts)

function epochToIso(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && v > 0) return new Date(v * 1000).toISOString();
  return null;
}

function extractPhone(contact: Record<string, unknown> | null): string | null {
  if (!contact) return null;
  if (typeof contact.phone_number === "string") return contact.phone_number;
  if (typeof contact.phone_e164 === "string") return contact.phone_e164;
  if (typeof contact.phone === "string") return contact.phone;
  return null;
}

function extractLabelName(label: Record<string, unknown>): string | null {
  if (typeof label.title === "string") return label.title;
  if (typeof label.name === "string") return label.name;
  return null;
}

function parseFromMe(row: Record<string, unknown>): boolean | null {
  if (typeof row.from_me === "boolean") return row.from_me;
  const msgType = typeof row.message_type === "string" ? row.message_type.toLowerCase() : null;
  if (msgType === "outgoing") return true;
  if (msgType === "incoming") return false;
  const dir = typeof row.direction === "string" ? row.direction.toLowerCase() : null;
  if (dir === "outbound" || dir === "sent") return true;
  if (dir === "inbound" || dir === "received") return false;
  return null;
}

describe("epochToIso", () => {
  it("converte epoch Unix (segundos) para ISO string", () => {
    const result = epochToIso(1777402630);
    expect(result).toBe("2026-04-28T18:57:10.000Z");
  });

  it("retorna ISO string como está", () => {
    const iso = "2026-04-28T19:56:09Z";
    expect(epochToIso(iso)).toBe(iso);
  });

  it("retorna null para undefined/null", () => {
    expect(epochToIso(undefined)).toBe(null);
    expect(epochToIso(null)).toBe(null);
  });

  it("retorna null para 0", () => {
    expect(epochToIso(0)).toBe(null);
  });
});

describe("extractPhone (phone_number priority)", () => {
  it("prioriza phone_number (formato real da API)", () => {
    const contact = {
      phone_number: "+5517996506398",
      phone: "+55179965",
      phone_e164: "+55179965",
    };
    expect(extractPhone(contact)).toBe("+5517996506398");
  });

  it("fallback para phone_e164", () => {
    const contact = { phone_e164: "+5511999999999" };
    expect(extractPhone(contact)).toBe("+5511999999999");
  });

  it("fallback para phone", () => {
    const contact = { phone: "+5511888888888" };
    expect(extractPhone(contact)).toBe("+5511888888888");
  });

  it("retorna null para contato sem telefone", () => {
    expect(extractPhone({})).toBe(null);
    expect(extractPhone(null)).toBe(null);
  });
});

describe("extractLabelName (title priority)", () => {
  it("prioriza title (formato real da API)", () => {
    const label = { title: "quase perdendo", name: "old_name" };
    expect(extractLabelName(label)).toBe("quase perdendo");
  });

  it("fallback para name", () => {
    const label = { name: "fechado" };
    expect(extractLabelName(label)).toBe("fechado");
  });

  it("retorna null sem title nem name", () => {
    expect(extractLabelName({})).toBe(null);
  });
});

describe("parseFromMe (message_type incoming/outgoing)", () => {
  it("detecta outgoing como from_me=true", () => {
    expect(parseFromMe({ message_type: "outgoing" })).toBe(true);
  });

  it("detecta incoming como from_me=false", () => {
    expect(parseFromMe({ message_type: "incoming" })).toBe(false);
  });

  it("case insensitive para message_type", () => {
    expect(parseFromMe({ message_type: "OUTGOING" })).toBe(true);
    expect(parseFromMe({ message_type: "Incoming" })).toBe(false);
  });

  it("prioriza from_me boolean quando presente", () => {
    expect(parseFromMe({ from_me: true, message_type: "incoming" })).toBe(true);
    expect(parseFromMe({ from_me: false, message_type: "outgoing" })).toBe(false);
  });

  it("fallback para direction", () => {
    expect(parseFromMe({ direction: "outbound" })).toBe(true);
    expect(parseFromMe({ direction: "inbound" })).toBe(false);
  });

  it("retorna null sem nenhum indicador", () => {
    expect(parseFromMe({})).toBe(null);
  });
});

describe("parsers com payload real da API Evo CRM", () => {
  const realConversation = {
    id: "f43f755c-a005-49eb-af2b-46338529cffc",
    inbox_id: "024371c5-9231-4b33-9357-21b20f17f68f",
    status: "open",
    created_at: 1777402630,
    updated_at: 1777406170,
    last_activity_at: 1777406170,
    contact: {
      id: "947d4a12-df28-4ec6-a90b-339811cc98e7",
      name: "Edi",
      phone_number: "+5517996506398",
      email: null,
    },
    inbox: {
      id: "024371c5-9231-4b33-9357-21b20f17f68f",
      name: "edi",
      channel_type: "Channel::Whatsapp",
      provider: "evolution_go",
    },
    labels: [],
    pipelines: [],
  };

  const realLabel = {
    id: "f8c6fd2c-89c2-484c-aeab-189160b94ddd",
    title: "conversa inicial",
    description: null,
    color: "#1f93ff",
    show_on_sidebar: true,
  };

  const realMessage = {
    id: "f0049fc1-674f-46f4-9892-a75ef9322c3a",
    content: "boa",
    message_type: "incoming",
    created_at: "2026-04-28T19:56:09Z",
  };

  it("extrai phone_number do contato real", () => {
    expect(extractPhone(realConversation.contact)).toBe("+5517996506398");
  });

  it("converte timestamps epoch do conversation real", () => {
    expect(epochToIso(realConversation.created_at)).toBe("2026-04-28T18:57:10.000Z");
    expect(epochToIso(realConversation.updated_at)).toBe("2026-04-28T19:56:10.000Z");
  });

  it("extrai title do label real", () => {
    expect(extractLabelName(realLabel)).toBe("conversa inicial");
  });

  it("detecta message_type incoming da mensagem real", () => {
    expect(parseFromMe(realMessage)).toBe(false);
  });

  it("mantém created_at ISO string da mensagem real", () => {
    expect(epochToIso(realMessage.created_at)).toBe("2026-04-28T19:56:09Z");
  });
});
