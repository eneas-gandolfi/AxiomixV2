/**
 * Arquivo: src/lib/whatsapp/__tests__/calendar-days.test.ts
 * Proposito: Validar a contagem de dias de calendario em America/Sao_Paulo —
 *            inclusive o ponto exato do bug do painel "Operacao ao vivo", em
 *            que dividir por 86_400_000 produzia "Há 9 dias" para uma mensagem
 *            de 04/05 16:16 vista em 14/05 antes das 16:16 (esperado: 10).
 */

import { describe, it, expect } from "vitest";
import {
  diffCalendarDaysInTz,
  localDateKey,
} from "@/lib/whatsapp/calendar-days";

describe("localDateKey", () => {
  it("formata a data no fuso SP no formato YYYY-MM-DD", () => {
    // 2026-05-04T19:16:00Z = 2026-05-04 16:16 SP
    expect(localDateKey(new Date("2026-05-04T19:16:00Z"))).toBe("2026-05-04");
  });

  it("cruza meia-noite SP corretamente quando o UTC ainda está no dia anterior", () => {
    // 2026-05-04T02:00:00Z = 2026-05-03 23:00 SP
    expect(localDateKey(new Date("2026-05-04T02:00:00Z"))).toBe("2026-05-03");
  });
});

describe("diffCalendarDaysInTz", () => {
  it("conta 10 dias entre 04/05 16:16 SP e 14/05 12:00 SP", () => {
    const from = new Date("2026-05-04T19:16:00Z"); // 04/05 16:16 SP
    const to = new Date("2026-05-14T15:00:00Z"); // 14/05 12:00 SP
    expect(diffCalendarDaysInTz(from, to)).toBe(10);
  });

  it("conta 10 dias mesmo antes da hora-da-mensagem no mesmo dia calendário (regressão do bug)", () => {
    // O cálculo antigo (delta / 86_400_000) dava 9 aqui porque ainda não tinha
    // passado das 16:16 — esse é o caso exato do screenshot do usuário.
    const from = new Date("2026-05-04T19:16:00Z"); // 04/05 16:16 SP
    const to = new Date("2026-05-14T19:00:00Z"); // 14/05 16:00 SP
    expect(diffCalendarDaysInTz(from, to)).toBe(10);
  });

  it("retorna 0 quando from e to caem no mesmo dia calendário SP", () => {
    const from = new Date("2026-05-14T12:00:00Z"); // 14/05 09:00 SP
    const to = new Date("2026-05-14T23:30:00Z"); // 14/05 20:30 SP
    expect(diffCalendarDaysInTz(from, to)).toBe(0);
  });

  it("clampa em 0 quando to é anterior a from (clock skew defensivo)", () => {
    const from = new Date("2026-05-14T12:00:00Z");
    const to = new Date("2026-05-10T12:00:00Z");
    expect(diffCalendarDaysInTz(from, to)).toBe(0);
  });

  it("considera a virada do dia em SP, não em UTC", () => {
    // 02:00 UTC = 23:00 SP do dia anterior; 12:00 UTC = 09:00 SP do mesmo dia UTC.
    const from = new Date("2026-05-04T02:00:00Z"); // 03/05 23:00 SP
    const to = new Date("2026-05-04T12:00:00Z"); // 04/05 09:00 SP
    expect(diffCalendarDaysInTz(from, to)).toBe(1);
  });

  it("retorna 0 quando algum dos lados é Date inválido", () => {
    const valid = new Date("2026-05-14T12:00:00Z");
    expect(diffCalendarDaysInTz(new Date("invalid"), valid)).toBe(0);
    expect(diffCalendarDaysInTz(valid, new Date("invalid"))).toBe(0);
  });
});
