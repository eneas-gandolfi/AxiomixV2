/**
 * Testes dos helpers puros exportados por conversations-table.tsx.
 * Não dependem de DOM — rodam em ambiente node.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  formatContactDisplay,
  formatDate,
  getTimeSinceLastMessage,
  sentimentBadgeClass,
  sentimentLabel,
  getIntentColor,
} from "../conversations-table";

describe("formatContactDisplay", () => {
  it("retorna o nome quando contact_name está preenchido", () => {
    expect(formatContactDisplay("Roberta Mendes", "5511987654321@s.whatsapp.net")).toBe(
      "Roberta Mendes",
    );
  });

  it("formata telefone brasileiro 11 dígitos com DDD quando nome é null", () => {
    expect(formatContactDisplay(null, "5511987654321@s.whatsapp.net")).toBe(
      "(11) 98765-4321",
    );
  });

  it("formata telefone brasileiro 10 dígitos (sem nono dígito) quando nome é null", () => {
    expect(formatContactDisplay(null, "551134567890@s.whatsapp.net")).toBe(
      "(11) 3456-7890",
    );
  });

  it("retorna o telefone bruto quando não bate o padrão BR", () => {
    expect(formatContactDisplay(null, "12345@s.whatsapp.net")).toBe("12345");
  });

  it("trim no nome remove espaços extras", () => {
    expect(formatContactDisplay("  Eneas  ", "5511999999999")).toBe("Eneas");
  });

  it("cai no telefone quando o nome é só whitespace", () => {
    expect(formatContactDisplay("   ", "5511987654321")).toBe("(11) 98765-4321");
  });
});

describe("getTimeSinceLastMessage", () => {
  const NOW = new Date("2026-05-12T12:00:00.000Z");

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("retorna string vazia quando lastMessageAt é null", () => {
    expect(getTimeSinceLastMessage(null)).toBe("");
  });

  it("retorna 'agora' quando há menos de 1 minuto", () => {
    expect(getTimeSinceLastMessage("2026-05-12T11:59:30.000Z")).toBe("agora");
  });

  it("retorna minutos quando há menos de 1 hora", () => {
    expect(getTimeSinceLastMessage("2026-05-12T11:13:00.000Z")).toBe("47min");
  });

  it("retorna horas quando há entre 1 e 24h", () => {
    expect(getTimeSinceLastMessage("2026-05-12T09:00:00.000Z")).toBe("3h");
  });

  it("retorna 'ontem' quando há 1 dia", () => {
    expect(getTimeSinceLastMessage("2026-05-11T12:00:00.000Z")).toBe("ontem");
  });

  it("retorna dias quando há 2-6 dias", () => {
    expect(getTimeSinceLastMessage("2026-05-08T12:00:00.000Z")).toBe("4d");
  });

  it("retorna data formatada quando há 7+ dias", () => {
    // 7 dias atrás cai fora do "Xd" e usa toLocaleDateString
    const result = getTimeSinceLastMessage("2026-04-29T12:00:00.000Z");
    expect(result).toMatch(/\d{2}/); // contém pelo menos o dia
  });
});

describe("sentimentBadgeClass + sentimentLabel", () => {
  it("retorna classe success pra positivo", () => {
    expect(sentimentBadgeClass("positivo")).toContain("success");
  });

  it("retorna classe danger pra negativo", () => {
    expect(sentimentBadgeClass("negativo")).toContain("danger");
  });

  it("retorna 'Sem análise' como label quando sentiment é null", () => {
    expect(sentimentLabel(null)).toBe("Sem análise");
  });

  it("retorna o próprio sentiment como label quando presente", () => {
    expect(sentimentLabel("neutro")).toBe("neutro");
  });
});

describe("getIntentColor", () => {
  it("retorna text-success pra compra", () => {
    expect(getIntentColor("compra")).toBe("text-success");
  });

  it("retorna text-danger pra reclamacao e cancelamento", () => {
    expect(getIntentColor("reclamacao")).toBe("text-danger");
    expect(getIntentColor("cancelamento")).toBe("text-danger");
  });

  it("retorna text-muted pra intent desconhecida", () => {
    expect(getIntentColor("intent-inexistente")).toBe("text-muted");
    expect(getIntentColor(null)).toBe("text-muted");
  });
});

describe("formatDate", () => {
  it("retorna 'Sem data' quando o valor é null", () => {
    expect(formatDate(null)).toBe("Sem data");
  });

  it("retorna data formatada pt-BR quando há valor", () => {
    // formato pt-BR varia por implementação, mas contém pelo menos /
    expect(formatDate("2026-05-12T12:00:00.000Z")).toContain("/");
  });
});
