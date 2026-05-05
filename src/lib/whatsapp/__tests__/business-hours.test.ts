/**
 * Arquivo: src/lib/whatsapp/__tests__/business-hours.test.ts
 * Propósito: Validar a aritmética de exclusão de janela do TFR — tempo
 *            "dentro do horário" sob diferentes cenários (mesmo dia,
 *            atravessando dias, fim de semana fechado, fora do expediente).
 */

import { describe, it, expect } from "vitest";
import {
  computeBusinessSecondsElapsed,
  isCurrentlyWithinBusinessHours,
  isBusinessHours,
} from "@/lib/whatsapp/business-hours";
import type { BusinessHours } from "@/lib/niches";

const TZ = "America/Sao_Paulo";

const RETAIL_HOURS: BusinessHours = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: null, // domingo fechado
};

const HEALTH_HOURS: BusinessHours = {
  mon: { open: "08:00", close: "19:00" },
  tue: { open: "08:00", close: "19:00" },
  wed: { open: "08:00", close: "19:00" },
  thu: { open: "08:00", close: "19:00" },
  fri: { open: "08:00", close: "19:00" },
  sat: { open: "08:00", close: "13:00" },
  sun: null,
};

const ALWAYS_OPEN: BusinessHours = {
  mon: { open: "00:00", close: "23:59" },
  tue: { open: "00:00", close: "23:59" },
  wed: { open: "00:00", close: "23:59" },
  thu: { open: "00:00", close: "23:59" },
  fri: { open: "00:00", close: "23:59" },
  sat: { open: "00:00", close: "23:59" },
  sun: { open: "00:00", close: "23:59" },
};

// Helper pra construir Date no TZ alvo (usa offset implícito de São Paulo: UTC-3).
function spDate(yyyymmdd: string, hhmm: string): Date {
  return new Date(`${yyyymmdd}T${hhmm}:00-03:00`);
}

describe("computeBusinessSecondsElapsed", () => {
  describe("dentro do mesmo dia", () => {
    it("conta segundos quando ambos from/to estão dentro da janela", () => {
      // Terça (varejo abre 10-22). Cliente esperando das 14:00 às 14:30.
      const from = spDate("2026-05-05", "14:00");
      const to = spDate("2026-05-05", "14:30");
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(30 * 60); // 1800s
    });

    it("zera quando o intervalo está totalmente fora da janela", () => {
      // Terça às 23:00 (já fechou às 22:00) → ainda dentro do mesmo dia
      const from = spDate("2026-05-05", "23:00");
      const to = spDate("2026-05-05", "23:30");
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(0);
    });

    it("clipa pro horário de abertura quando o cliente manda antes", () => {
      // Manda 9:30, hora atual 10:30. Conta só 30min (10:00→10:30).
      const from = spDate("2026-05-05", "09:30");
      const to = spDate("2026-05-05", "10:30");
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(30 * 60);
    });

    it("clipa pelo fechamento", () => {
      // 21:30 → 22:30 (fecha 22:00) → conta 30min
      const from = spDate("2026-05-05", "21:30");
      const to = spDate("2026-05-05", "22:30");
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(30 * 60);
    });
  });

  describe("atravessando dias", () => {
    it("não conta tempo de domingo (loja fechada)", () => {
      // Sábado 21:00 → segunda 11:00.
      // Sábado: 21:00→22:00 = 1h
      // Domingo: fechado = 0
      // Segunda: 10:00→11:00 = 1h
      // Total: 2h = 7200s
      const from = spDate("2026-05-02", "21:00"); // sábado
      const to = spDate("2026-05-04", "11:00"); // segunda
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(2 * 3600);
    });

    it("conta dia inteiro de open quando ambos extremos são fora", () => {
      // Sábado 02h (antes da abertura) → segunda 23h (após fechamento)
      // Sábado: 10-22 = 12h
      // Domingo: 0
      // Segunda: 10-22 = 12h
      // Total: 24h = 86400s
      const from = spDate("2026-05-02", "02:00");
      const to = spDate("2026-05-04", "23:00");
      const elapsed = computeBusinessSecondsElapsed(from, to, RETAIL_HOURS, TZ);
      expect(elapsed).toBe(24 * 3600);
    });

    it("clínica de saúde conta sábado parcial (8-13)", () => {
      // Sexta 18:00 → sábado 12:00.
      // Sexta: 18:00→19:00 = 1h
      // Sábado: 8:00→12:00 = 4h
      // Total: 5h
      const from = spDate("2026-05-01", "18:00"); // sexta
      const to = spDate("2026-05-02", "12:00"); // sábado
      const elapsed = computeBusinessSecondsElapsed(from, to, HEALTH_HOURS, TZ);
      expect(elapsed).toBe(5 * 3600);
    });
  });

  describe("casos extremos", () => {
    it("retorna 0 quando to <= from", () => {
      const t = spDate("2026-05-05", "14:00");
      expect(computeBusinessSecondsElapsed(t, t, RETAIL_HOURS, TZ)).toBe(0);
      expect(
        computeBusinessSecondsElapsed(
          t,
          new Date(t.getTime() - 1000),
          RETAIL_HOURS,
          TZ,
        ),
      ).toBe(0);
    });

    it("loja 24/7 conta corrido", () => {
      const from = spDate("2026-05-05", "14:00");
      const to = spDate("2026-05-05", "16:30");
      const elapsed = computeBusinessSecondsElapsed(from, to, ALWAYS_OPEN, TZ);
      // 24/7 com close=23:59 perde só os últimos 60s do dia, mas no mesmo dia
      // o intervalo está totalmente dentro.
      expect(elapsed).toBe(2 * 3600 + 30 * 60);
    });

    it("schedule todo null retorna 0 (impossível atender)", () => {
      const allClosed: BusinessHours = {
        mon: null, tue: null, wed: null, thu: null,
        fri: null, sat: null, sun: null,
      };
      const from = spDate("2026-05-05", "14:00");
      const to = spDate("2026-05-06", "14:00");
      expect(computeBusinessSecondsElapsed(from, to, allClosed, TZ)).toBe(0);
    });
  });
});

describe("isCurrentlyWithinBusinessHours", () => {
  it("dentro do horário em dia útil", () => {
    const now = spDate("2026-05-05", "14:00"); // terça 14h
    expect(isCurrentlyWithinBusinessHours(now, RETAIL_HOURS, TZ)).toBe(true);
  });

  it("antes da abertura", () => {
    const now = spDate("2026-05-05", "08:00"); // terça 8h, abre 10h
    expect(isCurrentlyWithinBusinessHours(now, RETAIL_HOURS, TZ)).toBe(false);
  });

  it("após fechamento", () => {
    const now = spDate("2026-05-05", "23:00"); // terça 23h, fechou 22h
    expect(isCurrentlyWithinBusinessHours(now, RETAIL_HOURS, TZ)).toBe(false);
  });

  it("domingo (fechado o dia todo)", () => {
    const now = spDate("2026-05-03", "14:00"); // domingo
    expect(isCurrentlyWithinBusinessHours(now, RETAIL_HOURS, TZ)).toBe(false);
  });

  it("sábado parcial — meio-dia tá aberto, 14h não (saúde 8-13)", () => {
    const noon = spDate("2026-05-02", "12:00"); // sábado
    const afternoon = spDate("2026-05-02", "14:00");
    expect(isCurrentlyWithinBusinessHours(noon, HEALTH_HOURS, TZ)).toBe(true);
    expect(isCurrentlyWithinBusinessHours(afternoon, HEALTH_HOURS, TZ)).toBe(false);
  });
});

describe("isBusinessHours (type guard)", () => {
  it("aceita schema válido com 7 dias", () => {
    expect(isBusinessHours(RETAIL_HOURS)).toBe(true);
    expect(isBusinessHours(ALWAYS_OPEN)).toBe(true);
  });

  it("rejeita objetos sem todos os dias", () => {
    expect(
      isBusinessHours({ mon: { open: "10:00", close: "18:00" } }),
    ).toBe(false);
  });

  it("rejeita schedule com tipos errados", () => {
    expect(
      isBusinessHours({
        mon: { open: 1000, close: "18:00" },
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null,
      }),
    ).toBe(false);
  });

  it("rejeita não-objetos", () => {
    expect(isBusinessHours(null)).toBe(false);
    expect(isBusinessHours("retail")).toBe(false);
    expect(isBusinessHours([])).toBe(false);
    expect(isBusinessHours(123)).toBe(false);
  });
});
