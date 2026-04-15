/**
 * Arquivo: src/lib/social/timezone.ts
 * Proposito: Utilitarios de conversao entre local (TZ da empresa) <-> UTC para o Social Publisher.
 *            Usa apenas APIs nativas (Intl) para evitar dependencias extras.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

export const DEFAULT_COMPANY_TIMEZONE = "America/Sao_Paulo";

/**
 * Extrai as partes locais (Y-M-D H:m:s) de um instante UTC, conforme vistas no fuso `tz`.
 */
function getZonedParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24, // en-US usa 24 com hour12:false, mas as vezes retorna 24 a meia-noite
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Converte uma data/hora "local" interpretada no fuso `tz` para o instante UTC correspondente.
 * Retorna uma ISO string UTC pronta para enviar ao backend / gravar no banco.
 */
export function zonedLocalToUtcIso(
  year: number,
  monthIndex: number, // 0-11
  day: number,
  hour: number,
  minute: number,
  tz: string
): string {
  // 1) Chute inicial: assume que os campos ja eram UTC.
  const utcGuess = Date.UTC(year, monthIndex, day, hour, minute, 0);
  // 2) Descobre qual seria a renderizacao desse instante no fuso alvo.
  const rendered = getZonedParts(new Date(utcGuess), tz);
  const renderedUtc = Date.UTC(
    rendered.year,
    rendered.month - 1,
    rendered.day,
    rendered.hour,
    rendered.minute,
    rendered.second
  );
  // 3) Diferenca e o offset do TZ naquele instante.
  const offset = renderedUtc - utcGuess;
  return new Date(utcGuess - offset).toISOString();
}

/**
 * Converte um instante UTC (ISO) para um objeto `Date` cujos campos locais representam
 * o horario no fuso da empresa. Util para popular inputs controlados que trabalham com Date.
 *
 * ATENCAO: o objeto retornado tem o horario alvo nos campos locais do sistema do navegador,
 * mas NAO representa o mesmo instante. Use apenas para exibicao e para montar valores
 * que voltarao a passar por `zonedLocalToUtcIso` antes de salvar.
 */
export function utcIsoToZonedLocalDate(iso: string, tz: string): Date {
  const source = new Date(iso);
  if (Number.isNaN(source.getTime())) return new Date();
  const parts = getZonedParts(source, tz);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/**
 * Formata um instante UTC (ISO) em texto localizado em pt-BR no fuso da empresa.
 */
export function formatInTimezone(
  iso: string,
  tz: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: tz }).format(d);
}

const FRIENDLY_TZ_NAMES: Record<string, string> = {
  "America/Sao_Paulo": "Brasilia",
  "America/Fortaleza": "Fortaleza",
  "America/Manaus": "Manaus",
  "America/Belem": "Belem",
  "America/Cuiaba": "Cuiaba",
  "America/Recife": "Recife",
  "America/Bahia": "Bahia",
  "America/Porto_Velho": "Porto Velho",
  "America/Rio_Branco": "Rio Branco",
  "America/Noronha": "Fernando de Noronha",
  "America/Campo_Grande": "Campo Grande",
};

export function friendlyTimezoneLabel(tz: string): string {
  const friendly = FRIENDLY_TZ_NAMES[tz] ?? tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const offsetMinutes = getTimezoneOffsetMinutes(tz);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  return `${friendly} (GMT${sign}${hours})`;
}

function getTimezoneOffsetMinutes(tz: string): number {
  const now = new Date();
  const parts = getZonedParts(now, tz);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((asUtc - now.getTime()) / 60000);
}
