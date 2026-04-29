/**
 * Testes para o parsing de labels no webhook handler do Evo CRM.
 * Verifica que labels são extraídas corretamente em diferentes formatos.
 */

import { describe, it, expect } from "vitest";

// Reimplementar a lógica de extração de labels do webhook handler
function extractLabels(data: Record<string, unknown>): string[] {
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  return rawLabels
    .map((l: unknown) => {
      if (typeof l === "string") return l;
      if (typeof l === "object" && l !== null) {
        const obj = l as Record<string, unknown>;
        return typeof obj.title === "string"
          ? obj.title
          : typeof obj.name === "string"
            ? obj.name
            : null;
      }
      return null;
    })
    .filter((l): l is string => l !== null);
}

describe("extractLabels (webhook payload)", () => {
  it("extrai labels como array de strings", () => {
    const data = { labels: ["quase perdendo", "fechado"] };
    expect(extractLabels(data)).toEqual(["quase perdendo", "fechado"]);
  });

  it("extrai labels como array de objetos com title", () => {
    const data = {
      labels: [
        { id: "1", title: "quase perdendo", color: "#ff0000" },
        { id: "2", title: "kickoff", color: "#00ff00" },
      ],
    };
    expect(extractLabels(data)).toEqual(["quase perdendo", "kickoff"]);
  });

  it("extrai labels como array de objetos com name (fallback)", () => {
    const data = {
      labels: [
        { id: "1", name: "conversa inicial" },
      ],
    };
    expect(extractLabels(data)).toEqual(["conversa inicial"]);
  });

  it("mistura de strings e objetos", () => {
    const data = {
      labels: [
        "urgente",
        { title: "quase perdendo" },
        null,
        42,
      ],
    };
    expect(extractLabels(data)).toEqual(["urgente", "quase perdendo"]);
  });

  it("retorna array vazio sem labels", () => {
    expect(extractLabels({})).toEqual([]);
    expect(extractLabels({ labels: null })).toEqual([]);
    expect(extractLabels({ labels: "not-array" })).toEqual([]);
  });

  it("retorna array vazio com labels inválidas", () => {
    expect(extractLabels({ labels: [null, undefined, 42, true] })).toEqual([]);
    expect(extractLabels({ labels: [{ id: "1" }] })).toEqual([]);
  });
});

describe("extractLabels com payload real do Evo CRM", () => {
  it("formato real: labels como array de strings na conversa", () => {
    // Formato real observado: conversation.labels é array de strings
    const realPayload = {
      id: "f43f755c-a005-49eb-af2b-46338529cffc",
      status: "open",
      labels: [],
      contact: { name: "Edi", phone_number: "+5517996506398" },
    };
    expect(extractLabels(realPayload)).toEqual([]);
  });

  it("formato esperado quando label é adicionada", () => {
    const payloadWithLabel = {
      id: "f43f755c-a005-49eb-af2b-46338529cffc",
      status: "open",
      labels: ["quase perdendo"],
      contact: { name: "Edi", phone_number: "+5517996506398" },
    };
    expect(extractLabels(payloadWithLabel)).toEqual(["quase perdendo"]);
  });
});
