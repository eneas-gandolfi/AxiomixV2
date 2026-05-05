/**
 * Arquivo: src/components/dashboard/__tests__/hero-metric.test.ts
 * Propósito: Validar a lógica determinística do HeroMetric — derivação de
 *            estado por count e copy contextual. Testes de DOM ficam pra
 *            quando @testing-library/react entrar no setup; aqui priorizamos
 *            o que controla o comportamento visual (boundaries de severidade
 *            e wording de cada estado) que é o que mais quebra na revisão.
 */

import { describe, it, expect } from "vitest";
import {
  deriveHeroState,
  formatHeroThreshold,
  getHeroCopy,
  formatWaitLabel,
} from "@/components/dashboard/hero-metric";

const VAREJO_NOUN = { singular: "Cliente", plural: "Clientes" };

describe("deriveHeroState", () => {
  it("count=0 retorna 'idle' (verde silencioso)", () => {
    expect(deriveHeroState(0, false)).toBe("idle");
  });

  it("count entre 1 e 3 retorna 'amber'", () => {
    expect(deriveHeroState(1, false)).toBe("amber");
    expect(deriveHeroState(2, false)).toBe("amber");
    expect(deriveHeroState(3, false)).toBe("amber");
  });

  it("count >= 4 retorna 'red'", () => {
    expect(deriveHeroState(4, false)).toBe("red");
    expect(deriveHeroState(50, false)).toBe("red");
  });

  it("isCalibrating sobrepõe qualquer count (Sally's empty-state guard)", () => {
    expect(deriveHeroState(0, true)).toBe("calibrating");
    expect(deriveHeroState(10, true)).toBe("calibrating");
  });
});

describe("formatWaitLabel", () => {
  it("formata < 1h em minutos", () => {
    expect(formatWaitLabel(60)).toBe("há 1min");
    expect(formatWaitLabel(720)).toBe("há 12min");
    expect(formatWaitLabel(2820)).toBe("há 47min");
  });

  it("formata >= 1h em horas", () => {
    expect(formatWaitLabel(3600)).toBe("há 1h");
    expect(formatWaitLabel(7200)).toBe("há 2h");
    expect(formatWaitLabel(18000)).toBe("há 5h");
  });

  it("formata >= 1d em dias", () => {
    expect(formatWaitLabel(86400)).toBe("há 1d");
    expect(formatWaitLabel(259200)).toBe("há 3d");
  });
});

describe("formatHeroThreshold", () => {
  it("formata segundos como minutos abaixo de 1h", () => {
    expect(formatHeroThreshold(300)).toBe("5min");
    expect(formatHeroThreshold(600)).toBe("10min");
    expect(formatHeroThreshold(1200)).toBe("20min");
  });

  it("formata como horas a partir de 3600s", () => {
    expect(formatHeroThreshold(3600)).toBe("1h");
    expect(formatHeroThreshold(7200)).toBe("2h");
    expect(formatHeroThreshold(14400)).toBe("4h");
  });
});

describe("getHeroCopy", () => {
  it("estado idle: 'Tudo respondido. Bom trabalho.'", () => {
    const copy = getHeroCopy(
      "idle",
      0,
      VAREJO_NOUN,
      600,
      "Conversas paradas",
    );
    expect(copy.title).toBe("Tudo respondido. Bom trabalho.");
    expect(copy.body).toContain("Nenhum cliente");
    expect(copy.body).toContain("10min");
    expect(copy.ctaLabel).toBe("Abrir operação");
  });

  it("estado amber count=1: título não começa com número (badge mostra contagem)", () => {
    const copy = getHeroCopy(
      "amber",
      1,
      VAREJO_NOUN,
      600,
      "Conversas paradas",
    );
    expect(copy.title).toBe("Cliente parado há mais de 10min");
    expect(copy.title).not.toMatch(/^\d/);
    expect(copy.body).not.toMatch(/\d/);
    expect(copy.ctaLabel).toBe("Abrir fila");
  });

  it("estado amber count=3 usa plural sem número no título", () => {
    const copy = getHeroCopy(
      "amber",
      3,
      VAREJO_NOUN,
      600,
      "Conversas paradas",
    );
    expect(copy.title).toBe("Clientes parados há mais de 10min");
  });

  it("estado red: título de urgência sem número (vai pro badge)", () => {
    const copy = getHeroCopy(
      "red",
      7,
      VAREJO_NOUN,
      600,
      "Conversas paradas",
    );
    expect(copy.title).toBe("Clientes em risco — fila afogando");
    expect(copy.title).not.toMatch(/^\d/);
    expect(copy.body).not.toMatch(/\d/);
    expect(copy.ctaLabel).toBe("Chamar reforço");
  });

  it("estado calibrating não vaza count, vira promessa de baseline", () => {
    const copy = getHeroCopy(
      "calibrating",
      99,
      VAREJO_NOUN,
      600,
      "Conversas paradas",
    );
    expect(copy.title).toContain("calibrando");
    expect(copy.title).not.toContain("99");
    expect(copy.body).toContain("7 dias");
  });

  it("adapta ao nicho saúde (Paciente/Pacientes)", () => {
    const saude = { singular: "Paciente", plural: "Pacientes" };
    const copy = getHeroCopy(
      "amber",
      2,
      saude,
      1800,
      "Pacientes esperando",
    );
    expect(copy.title).toBe("Pacientes parados há mais de 30min");
  });

  it("adapta ao nicho imobiliário (Lead/Leads)", () => {
    const imob = { singular: "Lead", plural: "Leads" };
    const copy = getHeroCopy(
      "amber",
      1,
      imob,
      1800,
      "Leads esperando",
    );
    expect(copy.title).toBe("Lead parado há mais de 30min");
  });
});
