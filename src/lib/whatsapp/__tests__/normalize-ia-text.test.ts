import { describe, it, expect } from "vitest";
import {
  fixAccents,
  canonicalIntent,
  canonicalStage,
  canonicalSentiment,
} from "../normalize-ia-text";

describe("fixAccents", () => {
  it("fixes common -cao words", () => {
    expect(fixAccents("Cliente demonstra atrito ou insatisfacao.")).toBe(
      "Cliente demonstra atrito ou insatisfação.",
    );
    expect(fixAccents("Pedimos informacao sobre o pedido")).toBe(
      "Pedimos informação sobre o pedido",
    );
  });

  it("preserves case of original word", () => {
    expect(fixAccents("Nao podemos fazer esse valor")).toBe(
      "Não podemos fazer esse valor",
    );
    expect(fixAccents("nao recebi")).toBe("não recebi");
  });

  it("handles multiple replacements in same string", () => {
    expect(fixAccents("Nao tem solucao para essa situacao")).toBe(
      "Não tem solução para essa situação",
    );
  });

  it("leaves words with proper accents alone", () => {
    expect(fixAccents("não recebi a confirmação")).toBe(
      "não recebi a confirmação",
    );
  });

  it("does not match inside other words (word boundary)", () => {
    expect(fixAccents("limpenao")).toBe("limpenao");
    expect(fixAccents("nada novo")).toBe("nada novo");
  });

  it("returns empty for null/undefined/empty", () => {
    expect(fixAccents(null)).toBe("");
    expect(fixAccents(undefined)).toBe("");
    expect(fixAccents("")).toBe("");
  });
});

describe("canonicalIntent", () => {
  it("normalizes known intents to canonical capitalized form", () => {
    expect(canonicalIntent("reclamacao")).toBe("Reclamação");
    expect(canonicalIntent("RECLAMACAO")).toBe("Reclamação");
    expect(canonicalIntent("duvida")).toBe("Dúvida");
    expect(canonicalIntent("informacao")).toBe("Informação");
  });

  it("falls back to fixAccents for unknown intents", () => {
    expect(canonicalIntent("decisao final")).toBe("decisão final");
  });

  it("returns empty for null/empty", () => {
    expect(canonicalIntent(null)).toBe("");
    expect(canonicalIntent("")).toBe("");
  });
});

describe("canonicalStage", () => {
  it("maps EN to PT canonical", () => {
    expect(canonicalStage("qualification")).toBe("Qualificação");
    expect(canonicalStage("post_sale")).toBe("Pós-venda");
    expect(canonicalStage("discovery")).toBe("Discovery");
  });

  it("returns Indefinido for null", () => {
    expect(canonicalStage(null)).toBe("Indefinido");
  });
});

describe("canonicalSentiment", () => {
  it("returns canonical lowercase sentiment", () => {
    expect(canonicalSentiment("Negativo")).toBe("negativo");
    expect(canonicalSentiment("NEUTRO")).toBe("neutro");
  });
});
