/**
 * Arquivo: src/lib/whatsapp/heatmap-resposta.ts
 * Proposito: Construir o heatmap "chegada vs resposta" — para cada celula
 *            (dia-da-semana, hora), retorna quantos leads chegaram naquela
 *            faixa e o TFR mediano da resposta. Celulas com chegada mas
 *            sem resposta dentro do SLA viram "gap" — onde dinheiro escapa
 *            por horario.
 *
 *            Tudo agregado em America/Sao_Paulo, mesmo padrao do business-hours.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { classifyMessageDirection, type MessageLight } from "@/lib/whatsapp/pulso-comercial";

const TIMEZONE = "America/Sao_Paulo";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABEL: Record<DayKey, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sab",
  sun: "Dom",
};

export type HeatmapCell = {
  day: DayKey;
  hour: number;
  inboundCount: number;
  /** TFR mediano em segundos para os inbounds que cairam nessa celula */
  medianTfrSec: number | null;
  /** True se houve >=1 inbound mas o TFR mediano excedeu o SLA */
  isGap: boolean;
};

export type ResponseHeatmap = {
  cells: HeatmapCell[];
  peakCell: HeatmapCell | null;
  worstGap: HeatmapCell | null;
};

const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function getDayHourInSP(date: Date): { day: DayKey; hour: number } | null {
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value;
  const hourPart = parts.find((p) => p.type === "hour")?.value;
  if (!weekdayPart || !hourPart) return null;

  const WEEKDAY: Record<string, DayKey> = {
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
    Sun: "sun",
  };
  const day = WEEKDAY[weekdayPart];
  const hour = Number(hourPart === "24" ? "0" : hourPart);
  if (!day || Number.isNaN(hour)) return null;
  return { day, hour };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeResponseHeatmap(
  messages: MessageLight[],
  slaSeconds: number,
): ResponseHeatmap {
  type Pair = { firstInboundMs: number | null; firstOutboundMs: number | null };
  const pairs = new Map<string, Pair>();
  const sorted = messages
    .map((m) => ({ ...m, ts: new Date(m.sentAt).getTime() }))
    .filter((m) => !Number.isNaN(m.ts))
    .sort((a, b) => a.ts - b.ts);

  for (const m of sorted) {
    const kind = classifyMessageDirection(m.direction);
    let pair = pairs.get(m.conversationId);
    if (!pair) {
      pair = { firstInboundMs: null, firstOutboundMs: null };
      pairs.set(m.conversationId, pair);
    }
    if (kind === "inbound") {
      if (pair.firstInboundMs === null) pair.firstInboundMs = m.ts;
    } else if (kind === "outbound") {
      if (
        pair.firstInboundMs !== null &&
        pair.firstOutboundMs === null &&
        m.ts >= pair.firstInboundMs
      ) {
        pair.firstOutboundMs = m.ts;
      }
    }
  }

  // Inicializa grid 7×24
  const grid = new Map<string, { tfrs: number[]; inboundCount: number }>();
  for (const day of DAY_ORDER) {
    for (let hour = 0; hour < 24; hour++) {
      grid.set(`${day}_${hour}`, { tfrs: [], inboundCount: 0 });
    }
  }

  for (const pair of pairs.values()) {
    if (pair.firstInboundMs === null) continue;
    const cell = getDayHourInSP(new Date(pair.firstInboundMs));
    if (!cell) continue;
    const key = `${cell.day}_${cell.hour}`;
    const slot = grid.get(key)!;
    slot.inboundCount += 1;
    if (pair.firstOutboundMs !== null) {
      const tfr = (pair.firstOutboundMs - pair.firstInboundMs) / 1000;
      if (tfr >= 0) slot.tfrs.push(tfr);
    }
  }

  const cells: HeatmapCell[] = [];
  for (const day of DAY_ORDER) {
    for (let hour = 0; hour < 24; hour++) {
      const slot = grid.get(`${day}_${hour}`)!;
      const medianTfr = median(slot.tfrs);
      cells.push({
        day,
        hour,
        inboundCount: slot.inboundCount,
        medianTfrSec: medianTfr,
        isGap: slot.inboundCount > 0 && (medianTfr === null || medianTfr > slaSeconds),
      });
    }
  }

  let peakCell: HeatmapCell | null = null;
  let worstGap: HeatmapCell | null = null;
  for (const cell of cells) {
    if (!peakCell || cell.inboundCount > peakCell.inboundCount) peakCell = cell;
    if (cell.isGap) {
      const cellTfr = cell.medianTfrSec ?? Infinity;
      const worstTfr = worstGap?.medianTfrSec ?? -Infinity;
      if (!worstGap || cellTfr > worstTfr || cell.inboundCount > worstGap.inboundCount) {
        worstGap = cell;
      }
    }
  }
  if (peakCell && peakCell.inboundCount === 0) peakCell = null;

  return { cells, peakCell, worstGap };
}
