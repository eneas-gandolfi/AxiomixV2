import { describe, it, expect } from "vitest";
import { canonicalizeNoteContent, canonicalNoteHash } from "../note-extractor";

describe("canonicalizeNoteContent", () => {
  it("normaliza acentos", () => {
    expect(canonicalizeNoteContent("João prefere terças")).toBe("joao prefere tercas");
  });

  it("remove pontuação", () => {
    expect(canonicalizeNoteContent("Cliente: João, entregas!")).toBe("cliente joao entregas");
  });

  it("normaliza múltiplos espaços", () => {
    expect(canonicalizeNoteContent("texto   com    espaços")).toBe("texto com espacos");
  });

  it("trata case-insensitive", () => {
    expect(canonicalizeNoteContent("TEXTO")).toBe("texto");
  });
});

describe("canonicalNoteHash", () => {
  it("gera o mesmo hash para variações com acentos e pontuação", () => {
    const a = canonicalNoteHash("O cliente João prefere entregas às terças.");
    const b = canonicalNoteHash("o cliente joao prefere entregas as tercas");
    expect(a).toBe(b);
  });

  it("gera o mesmo hash para variações com case e pontuação", () => {
    const a = canonicalNoteHash("Maria NÃO gosta de relatórios longos!");
    const b = canonicalNoteHash("maria nao gosta de relatorios longos");
    expect(a).toBe(b);
  });

  it("gera hashes diferentes para conteúdos distintos", () => {
    const a = canonicalNoteHash("João prefere entregas às terças");
    const b = canonicalNoteHash("Maria prefere entregas às quartas");
    expect(a).not.toBe(b);
  });

  it("retorna hash curto (16 chars)", () => {
    const h = canonicalNoteHash("qualquer texto");
    expect(h.length).toBe(16);
  });
});
