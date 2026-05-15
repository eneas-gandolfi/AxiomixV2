/**
 * Testes do fingerprint de mensagens — garante determinismo cross-caminho
 * (webhook + sync REST) para que o índice unique parcial em
 * (company_id, external_id) rejeite duplicatas.
 */

import { describe, expect, it } from "vitest";

import { computeMessageFingerprint } from "../message-fingerprint";

const BASE_INPUT = {
  conversationExternalId: "01781ae0-ea84-4aba-9c89-6c385a433c43",
  direction: "inbound" as const,
  sentAtIso: "2026-05-15T18:03:41.000Z",
  content: "teste",
};

describe("computeMessageFingerprint", () => {
  it("retorna o mesmo hash para inputs idênticos (determinismo)", () => {
    const a = computeMessageFingerprint(BASE_INPUT);
    const b = computeMessageFingerprint(BASE_INPUT);
    expect(a).toBe(b);
  });

  it("começa com 'fp:' para distinguir de external_id real do Evo CRM (UUIDs)", () => {
    const fp = computeMessageFingerprint(BASE_INPUT);
    expect(fp.startsWith("fp:")).toBe(true);
  });

  it("muda quando conversationExternalId muda", () => {
    const a = computeMessageFingerprint(BASE_INPUT);
    const b = computeMessageFingerprint({ ...BASE_INPUT, conversationExternalId: "outro" });
    expect(a).not.toBe(b);
  });

  it("muda quando direction muda (inbound vs outbound)", () => {
    const a = computeMessageFingerprint(BASE_INPUT);
    const b = computeMessageFingerprint({ ...BASE_INPUT, direction: "outbound" });
    expect(a).not.toBe(b);
  });

  it("muda quando sentAtIso muda mesmo que por 1 segundo", () => {
    const a = computeMessageFingerprint(BASE_INPUT);
    const b = computeMessageFingerprint({
      ...BASE_INPUT,
      sentAtIso: "2026-05-15T18:03:42.000Z",
    });
    expect(a).not.toBe(b);
  });

  it("muda quando content muda", () => {
    const a = computeMessageFingerprint(BASE_INPUT);
    const b = computeMessageFingerprint({ ...BASE_INPUT, content: "outro conteudo" });
    expect(a).not.toBe(b);
  });

  it("hash tem 32 chars (após o prefixo 'fp:')", () => {
    const fp = computeMessageFingerprint(BASE_INPUT);
    const hashPart = fp.slice("fp:".length);
    expect(hashPart).toHaveLength(32);
    expect(hashPart).toMatch(/^[0-9a-f]+$/);
  });
});
