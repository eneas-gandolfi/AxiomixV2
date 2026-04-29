import { describe, it, expect } from "vitest";
import { isRiskLabel, formatAlertMessage } from "../crm-to-group-alerts";

describe("isRiskLabel", () => {
  it("detecta 'quase perdendo' como risco", () => {
    expect(isRiskLabel("quase perdendo")).toBe(true);
  });

  it("detecta 'urgente' como risco", () => {
    expect(isRiskLabel("urgente")).toBe(true);
  });

  it("detecta 'at risk' como risco", () => {
    expect(isRiskLabel("at risk")).toBe(true);
  });

  it("detecta 'cancelamento' como risco", () => {
    expect(isRiskLabel("cancelamento")).toBe(true);
  });

  it("ignora case (case-insensitive)", () => {
    expect(isRiskLabel("QUASE PERDENDO")).toBe(true);
    expect(isRiskLabel("Urgente")).toBe(true);
  });

  it("ignora espaços extras", () => {
    expect(isRiskLabel("  quase perdendo  ")).toBe(true);
  });

  it("retorna false para labels normais", () => {
    expect(isRiskLabel("conversa inicial")).toBe(false);
    expect(isRiskLabel("fechado")).toBe(false);
    expect(isRiskLabel("kickoff")).toBe(false);
    expect(isRiskLabel("")).toBe(false);
  });
});

describe("formatAlertMessage", () => {
  it("formata mensagem com nome e label", () => {
    const msg = formatAlertMessage(
      {
        conversationId: "abc-123",
        contactName: "João Silva",
        contactPhone: "+5511999999999",
        labels: ["quase perdendo"],
        assigneeName: null,
      },
      ["quase perdendo"]
    );

    expect(msg).toContain("Alerta CRM");
    expect(msg).toContain("*quase perdendo*");
    expect(msg).toContain("João Silva");
    expect(msg).toContain("+5511999999999");
    expect(msg).toContain("voluntário");
  });

  it("inclui responsável quando presente", () => {
    const msg = formatAlertMessage(
      {
        conversationId: "abc-123",
        contactName: "Maria",
        contactPhone: null,
        labels: ["urgente"],
        assigneeName: "Carlos",
      },
      ["urgente"]
    );

    expect(msg).toContain("Carlos");
    expect(msg).toContain("Responsável");
  });

  it("omite telefone quando null", () => {
    const msg = formatAlertMessage(
      {
        conversationId: "abc-123",
        contactName: "Maria",
        contactPhone: null,
        labels: ["urgente"],
        assigneeName: null,
      },
      ["urgente"]
    );

    expect(msg).not.toContain("Telefone");
  });

  it("lista múltiplas labels de risco", () => {
    const msg = formatAlertMessage(
      {
        conversationId: "abc-123",
        contactName: "Pedro",
        contactPhone: "+5511888888888",
        labels: ["quase perdendo", "urgente"],
        assigneeName: null,
      },
      ["quase perdendo", "urgente"]
    );

    expect(msg).toContain("*quase perdendo*");
    expect(msg).toContain("*urgente*");
  });
});
