/**
 * Arquivo: src/components/whatsapp/__tests__/analise-period-picker.test.ts
 * Propósito: Garante o parser de query param `?period=` — fallback pro default
 *            quando ausente, inválido ou fora da lista permitida.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PERIOD,
  VALID_PERIODS,
  isValidPeriod,
  parsePeriodFromParam,
} from "@/components/whatsapp/analise-period-picker";

describe("VALID_PERIODS", () => {
  it("inclui 7, 30 e 90 dias", () => {
    expect(VALID_PERIODS).toContain(7);
    expect(VALID_PERIODS).toContain(30);
    expect(VALID_PERIODS).toContain(90);
  });

  it("default é 30 dias", () => {
    expect(DEFAULT_PERIOD).toBe(30);
  });

  it("default está na lista válida", () => {
    expect((VALID_PERIODS as readonly number[]).includes(DEFAULT_PERIOD)).toBe(true);
  });
});

describe("isValidPeriod", () => {
  it("aceita os 3 períodos canônicos", () => {
    expect(isValidPeriod(7)).toBe(true);
    expect(isValidPeriod(30)).toBe(true);
    expect(isValidPeriod(90)).toBe(true);
  });

  it("rejeita números fora da lista", () => {
    expect(isValidPeriod(0)).toBe(false);
    expect(isValidPeriod(1)).toBe(false);
    expect(isValidPeriod(14)).toBe(false);
    expect(isValidPeriod(60)).toBe(false);
    expect(isValidPeriod(365)).toBe(false);
    expect(isValidPeriod(-7)).toBe(false);
  });

  it("rejeita não-números", () => {
    expect(isValidPeriod("7")).toBe(false);
    expect(isValidPeriod(null)).toBe(false);
    expect(isValidPeriod(undefined)).toBe(false);
    expect(isValidPeriod({})).toBe(false);
    expect(isValidPeriod(NaN)).toBe(false);
  });
});

describe("parsePeriodFromParam", () => {
  it("retorna default pra undefined", () => {
    expect(parsePeriodFromParam(undefined)).toBe(DEFAULT_PERIOD);
  });

  it("retorna default pra string[] (ambiguidade — pega o primeiro? não)", () => {
    expect(parsePeriodFromParam(["7"])).toBe(DEFAULT_PERIOD);
  });

  it("aceita strings válidas", () => {
    expect(parsePeriodFromParam("7")).toBe(7);
    expect(parsePeriodFromParam("30")).toBe(30);
    expect(parsePeriodFromParam("90")).toBe(90);
  });

  it("retorna default pra string inválida", () => {
    expect(parsePeriodFromParam("60")).toBe(DEFAULT_PERIOD);
    expect(parsePeriodFromParam("abc")).toBe(DEFAULT_PERIOD);
    expect(parsePeriodFromParam("")).toBe(DEFAULT_PERIOD);
  });

  it("é resistente a variações tipadas (parseInt aceita '7d')", () => {
    // parseInt("7d", 10) === 7 — comportamento conhecido. Não é bug, só anota.
    expect(parsePeriodFromParam("7d")).toBe(7);
  });
});
