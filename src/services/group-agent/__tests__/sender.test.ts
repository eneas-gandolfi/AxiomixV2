import { describe, it, expect } from "vitest";
import { splitResponse, isInsideFormatting } from "../sender";

describe("isInsideFormatting", () => {
  it("retorna false para texto puro", () => {
    expect(isInsideFormatting("texto normal sem nada", 10)).toBe(false);
  });

  it("retorna true quando corte cai dentro de negrito aberto", () => {
    // "antes *negrito aqui*" — índice 12 está dentro do negrito
    const text = "antes *negrito aqui*";
    expect(isInsideFormatting(text, 12)).toBe(true);
  });

  it("retorna false quando negrito já foi fechado", () => {
    const text = "*negrito* depois";
    expect(isInsideFormatting(text, 12)).toBe(false);
  });

  it("retorna true dentro de itálico aberto", () => {
    const text = "texto _italico";
    expect(isInsideFormatting(text, 10)).toBe(true);
  });

  it("trata negrito e itálico aninhados", () => {
    const text = "*negrito _italico";
    expect(isInsideFormatting(text, 15)).toBe(true);
  });
});

describe("splitResponse", () => {
  it("não divide texto curto", () => {
    const text = "Texto curto";
    expect(splitResponse(text)).toEqual([text]);
  });

  it("divide texto longo em chunks", () => {
    const longText = "a".repeat(4500);
    const chunks = splitResponse(longText);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(4000));
  });

  it("prefere cortar em quebra de linha", () => {
    const block = "a".repeat(3500) + "\n" + "b".repeat(1000);
    const chunks = splitResponse(block);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain("a");
    expect(chunks[1]).toContain("b");
  });

  it("não quebra par de *negrito* ao dividir", () => {
    // Monta um texto que naturalmente cairia dentro de um *negrito*
    // sem o safeguard. Confirma que o chunk 1 não abre negrito sem fechar.
    const prefix = "x".repeat(3990);
    const withBold = prefix + " *texto negrito fechado aqui*";
    const chunks = splitResponse(withBold);
    chunks.forEach((chunk) => {
      // Conta * não escapados
      const stars = (chunk.match(/(?<!\\)\*/g) ?? []).length;
      // Cada chunk deve ter número par de * (todos balanceados)
      expect(stars % 2).toBe(0);
    });
  });

  it("não quebra par de _itálico_ ao dividir", () => {
    const prefix = "y".repeat(3990);
    const withItalic = prefix + " _trecho em italico longo_";
    const chunks = splitResponse(withItalic);
    chunks.forEach((chunk) => {
      const underscores = (chunk.match(/(?<!\\)_/g) ?? []).length;
      expect(underscores % 2).toBe(0);
    });
  });
});
