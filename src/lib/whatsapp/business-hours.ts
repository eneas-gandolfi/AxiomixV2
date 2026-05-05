/**
 * Arquivo: src/lib/whatsapp/business-hours.ts
 * Propósito: Cálculo do tempo de espera "dentro do horário comercial" pra
 *            exclusão de janela do TFR. Mary's red line: cronômetro pausa
 *            fora da jornada cadastrada — atendentes não são cobrados pelo
 *            tempo em que a loja está fechada.
 *
 *            Usa Intl.DateTimeFormat (built-in V8) pra timezone, sem libs
 *            externas. Precisão: granular até segundos. DST: assume schedule
 *            constante em wall-clock — fronteiras de DST podem flutuar até 1h
 *            (aceitável pro caso de uso).
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import type { BusinessHours, DayOfWeek } from "@/lib/niches";

const DAY_OF_WEEK_INTL: Record<string, DayOfWeek> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

const SECONDS_PER_DAY = 86400;

export type ZonedDate = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dow: DayOfWeek;
};

/**
 * Decompõe um Date UTC em componentes wall-clock no timezone informado.
 * Exportado pra reúso (heatmap dia×hora, etc).
 */
export function toZonedDate(date: Date, timeZone: string): ZonedDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    // "hour: 2-digit + hour12: false" pode retornar "24" no Chromium pra meia-noite — normaliza.
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
    dow: DAY_OF_WEEK_INTL[get("weekday")] ?? "mon",
  };
}

/** Converte "HH:MM" pra segundos-do-dia (00:00 = 0, 23:59 = 86340). */
function timeToSecondsOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 3600 + m * 60;
}

/** Compara duas datas zoneadas: -1 se a < b, 0 igual, 1 a > b (apenas calendário). */
function compareCalendarDay(a: ZonedDate, b: ZonedDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Avança a data zoneada em 1 dia calendar (mantém wall-clock 00:00). */
function nextCalendarDay(z: ZonedDate, timeZone: string): ZonedDate {
  // Construímos uma Date "âncora" de meio-dia (12:00) na timezone alvo
  // e adicionamos 24h. Meio-dia evita armadilhas de DST que ocorrem ao
  // amanhecer.
  const anchor = wallClockToUtc(
    { ...z, hour: 12, minute: 0, second: 0 },
    timeZone,
  );
  const next = new Date(anchor.getTime() + SECONDS_PER_DAY * 1000);
  return toZonedDate(next, timeZone);
}

/**
 * Dado um wall-clock (year/month/day/hour/min/sec) num timezone, retorna o
 * Date UTC correspondente. Aproximação iterativa: converte chute, mede o
 * delta da timezone, ajusta. 2 iterações cobrem DST.
 */
function wallClockToUtc(z: ZonedDate, timeZone: string): Date {
  // Primeiro chute: trata wall-clock como se fosse UTC
  let utcGuess = new Date(
    Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second),
  );

  // Itera 2x pra corrigir o offset
  for (let i = 0; i < 2; i++) {
    const zoned = toZonedDate(utcGuess, timeZone);
    const wallSecs =
      z.hour * 3600 + z.minute * 60 + z.second;
    const guessSecs =
      zoned.hour * 3600 + zoned.minute * 60 + zoned.second;
    const dayDiff =
      (z.year - zoned.year) * 365 + (z.month - zoned.month) * 31 + (z.day - zoned.day);
    const delta = (wallSecs - guessSecs) + dayDiff * SECONDS_PER_DAY;
    if (delta === 0) break;
    utcGuess = new Date(utcGuess.getTime() + delta * 1000);
  }

  return utcGuess;
}

/**
 * Computa o tempo decorrido em segundos ENTRE [from] e [to] que cai DENTRO
 * da janela de atendimento. Ignora completamente o tempo fora do horário e
 * dias com schedule null (loja fechada).
 */
export function computeBusinessSecondsElapsed(
  from: Date,
  to: Date,
  hours: BusinessHours,
  timeZone: string,
): number {
  if (to <= from) return 0;

  const fromZ = toZonedDate(from, timeZone);
  const toZ = toZonedDate(to, timeZone);

  let total = 0;
  let cursor: ZonedDate = { ...fromZ };

  // Walk day by day, somando overlap com open window.
  while (compareCalendarDay(cursor, toZ) <= 0) {
    const schedule = hours[cursor.dow];
    if (schedule) {
      const dayOpen = timeToSecondsOfDay(schedule.open);
      const dayClose = timeToSecondsOfDay(schedule.close);

      if (dayClose > dayOpen) {
        // Slice do dia coberto pelo intervalo [from, to]
        const isFirstDay = compareCalendarDay(cursor, fromZ) === 0;
        const isLastDay = compareCalendarDay(cursor, toZ) === 0;

        const sliceStart = isFirstDay
          ? fromZ.hour * 3600 + fromZ.minute * 60 + fromZ.second
          : 0;
        const sliceEnd = isLastDay
          ? toZ.hour * 3600 + toZ.minute * 60 + toZ.second
          : SECONDS_PER_DAY;

        const overlapStart = Math.max(sliceStart, dayOpen);
        const overlapEnd = Math.min(sliceEnd, dayClose);

        if (overlapEnd > overlapStart) {
          total += overlapEnd - overlapStart;
        }
      }
    }

    if (compareCalendarDay(cursor, toZ) === 0) break;
    cursor = nextCalendarDay(cursor, timeZone);
  }

  return total;
}

/**
 * Verifica se "agora" está dentro do horário de atendimento da empresa.
 * Útil pra mostrar indicador "Loja fechada · cronômetro pausado".
 */
export function isCurrentlyWithinBusinessHours(
  now: Date,
  hours: BusinessHours,
  timeZone: string,
): boolean {
  const z = toZonedDate(now, timeZone);
  const schedule = hours[z.dow];
  if (!schedule) return false;

  const dayOpen = timeToSecondsOfDay(schedule.open);
  const dayClose = timeToSecondsOfDay(schedule.close);
  const nowSecs = z.hour * 3600 + z.minute * 60 + z.second;

  return nowSecs >= dayOpen && nowSecs < dayClose;
}

/**
 * Type guard pra runtime: verifica se um valor é BusinessHours válido. Usado
 * ao ler de jsonb do Supabase, que retorna `unknown`.
 */
export function isBusinessHours(value: unknown): value is BusinessHours {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const days: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  for (const day of days) {
    if (!(day in obj)) return false;
    const v = obj[day];
    if (v === null) continue;
    if (typeof v !== "object" || v === null) return false;
    const sched = v as { open?: unknown; close?: unknown };
    if (typeof sched.open !== "string" || typeof sched.close !== "string") {
      return false;
    }
  }
  return true;
}
