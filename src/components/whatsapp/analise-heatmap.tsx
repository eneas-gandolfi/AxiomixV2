/**
 * Arquivo: src/components/whatsapp/analise-heatmap.tsx
 * Propósito: §4 da aba Análise — "Algum padrão de horário preocupante?".
 *            Heatmap dia-da-semana × hora mostrando volume de insights nos
 *            últimos 30 dias. Cor proporcional ao count. Insight automático
 *            embaixo apontando o pico (se houver concentração relevante).
 *
 *            v1: usa volume como proxy. Próxima iteração pode trocar pra
 *            TFR médio (requer queries em messages, mais pesado).
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { TriangleAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toZonedDate } from "@/lib/whatsapp/business-hours";
import type { DayOfWeek } from "@/lib/niches";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const HOUR_START = 8;
const HOUR_END = 22; // exclusive — mostra 8h..21h (14 colunas)

const DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

type CellKey = `${DayOfWeek}_${number}`;

type CellData = {
  count: number;
  /** Timestamps (ms epoch) das ocorrências — sort confiável + formato no render */
  timestamps: number[];
};

function buildHourRange(): number[] {
  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);
  return hours;
}

/** Threshold: abaixo disso usamos escala absoluta (cada célula com 1-2 não vira
 *  vermelho só porque é o max). Acima disso usamos relativa (% do max). */
const SPARSE_DATA_THRESHOLD = 10;

/**
 * Wrapper que faz a linha do heatmap se distribuir no mesmo subgrid do
 * container pai (`subgrid` em col), permitindo aplicar fundo discreto pro
 * fim de semana sem quebrar o alinhamento das colunas.
 */
function ContainerRow({
  children,
  weekend,
}: {
  children: React.ReactNode;
  weekend: boolean;
}) {
  return (
    <div
      className={`col-span-full grid grid-cols-subgrid items-center rounded-md ${weekend ? "bg-[var(--color-surface-2)]/40" : ""}`}
    >
      {children}
    </div>
  );
}

type IntensityLevel = "empty" | "subtle" | "low" | "mid" | "high" | "alarm";

/** Determina o nível de intensidade da célula. Centraliza a lógica pra
 *  derivar bg e cor de texto em sincronia. */
function getIntensityLevel(
  value: number,
  max: number,
  total: number,
): IntensityLevel {
  if (max === 0 || value === 0) return "empty";
  if (total < SPARSE_DATA_THRESHOLD) {
    if (value >= 5) return "alarm";
    if (value >= 3) return "high";
    if (value >= 2) return "mid";
    return "subtle";
  }
  const ratio = value / max;
  if (ratio >= 0.85) return "alarm";
  if (ratio >= 0.65) return "high";
  if (ratio >= 0.4) return "mid";
  if (ratio >= 0.2) return "low";
  return "subtle";
}

const INTENSITY_BG: Record<IntensityLevel, string> = {
  empty: "bg-[var(--color-surface-2)]",
  subtle: "bg-[#A6E3DC]",
  low: "bg-[#5CC9BD]",
  mid: "bg-[#FFB370]",
  high: "bg-[var(--color-warning)]",
  alarm: "bg-[var(--color-danger)]",
};

/** Cor do texto que aparece DENTRO da célula. Branco em fundos escuros
 *  (high/alarm), preto em fundos claros. */
const INTENSITY_TEXT: Record<IntensityLevel, string> = {
  empty: "text-[var(--color-text-tertiary)]",
  subtle: "text-[#0F4F49]",
  low: "text-[#0F4F49]",
  mid: "text-[#5C2D00]",
  high: "text-white",
  alarm: "text-white",
};

function intensityClass(value: number, max: number, total: number): string {
  return INTENSITY_BG[getIntensityLevel(value, max, total)];
}

export async function AnaliseHeatmap({
  companyId,
  windowDays = 30,
}: {
  companyId: string;
  windowDays?: number;
}) {
  const supabase = await createSupabaseServerClient();

  // Lê niche_slug pra timezone (companies.timezone fica como fallback)
  const { data: company } = await supabase
    .from("companies")
    .select("timezone")
    .eq("id", companyId)
    .maybeSingle();
  const timezone = company?.timezone ?? "America/Sao_Paulo";

  const sinceDate = new Date(Date.now() - windowDays * DAY_MS);
  const since = sinceDate.toISOString();

  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", since);

  // Formatadores no fuso do tenant. Usa "month: short" pra exibir nome
  // abreviado em PT-BR ("abr", "mai", "jun") em vez de numero ("04", "05")
  // que exige traducao mental.
  const dayParts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
  });
  const monthParts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    month: "short",
  });

  const formatDayMonth = (date: Date): string => {
    const day = dayParts.format(date);
    // Intl PT-BR retorna "abr." com ponto — remove pra ficar mais compacto
    const month = monthParts.format(date).replace(/\.$/, "");
    return `${day} ${month}`;
  };

  const sinceLabel = formatDayMonth(sinceDate);
  const untilLabel = formatDayMonth(new Date());
  const rangeLabel = `${sinceLabel} → ${untilLabel}`;

  const cells = new Map<CellKey, CellData>();

  for (const insight of insights ?? []) {
    if (!insight.generated_at) continue;
    const date = new Date(insight.generated_at);
    const z = toZonedDate(date, timezone);
    if (z.hour < HOUR_START || z.hour >= HOUR_END) continue;
    const key: CellKey = `${z.dow}_${z.hour}`;
    const existing = cells.get(key) ?? { count: 0, timestamps: [] };
    existing.count += 1;
    existing.timestamps.push(date.getTime());
    cells.set(key, existing);
  }

  // Encontra hotspot (cell com mais volume) pra insight automático
  let hotspot: { dow: DayOfWeek; hour: number; count: number; timestamps: number[] } | null = null;
  for (const [key, data] of cells.entries()) {
    if (!hotspot || data.count > hotspot.count) {
      const [dow, hour] = key.split("_") as [DayOfWeek, string];
      hotspot = {
        dow,
        hour: parseInt(hour, 10),
        count: data.count,
        timestamps: data.timestamps,
      };
    }
  }

  const max = hotspot?.count ?? 0;
  const total = Array.from(cells.values()).reduce((s, v) => s + v.count, 0);

  if (total === 0) {
    return (
      <SectionWrapper number={4} question="Algum padrão de horário preocupante?">
        <p className="py-8 text-center text-sm italic text-[var(--color-text-tertiary)]">
          O mapa de calor aparece quando houver insights entre {sinceLabel} e{" "}
          {untilLabel} ({windowDays} dias).
        </p>
      </SectionWrapper>
    );
  }

  const hours = buildHourRange();

  // Gera o insight: hotspot só vira "preocupante" quando há volume suficiente
  // pra dar significância estatística — caso contrário não há padrão a apontar.
  const showInsight =
    hotspot !== null &&
    hotspot.count >= 3 &&
    total >= SPARSE_DATA_THRESHOLD &&
    hotspot.count / total >= 0.1;

  // Totais por linha (dia) e coluna (hora) — micro-summaries marginais
  const rowTotals = new Map<DayOfWeek, number>();
  const colTotals = new Map<number, number>();
  for (const dow of DAYS) {
    let rowSum = 0;
    for (const hour of hours) {
      const v = cells.get(`${dow}_${hour}`)?.count ?? 0;
      rowSum += v;
      colTotals.set(hour, (colTotals.get(hour) ?? 0) + v);
    }
    rowTotals.set(dow, rowSum);
  }

  // Boundaries semanticos: 12h = almoço, 18h = fim do expediente
  const isHourBoundary = (h: number) => h === 12 || h === 18;
  const isWeekend = (d: DayOfWeek) => d === "sat" || d === "sun";

  return (
    <SectionWrapper
      number={4}
      question="Algum padrão de horário preocupante?"
      subtitle={`Volume de insights por dia × hora · ${windowDays} dias (${rangeLabel}) · fuso ${timezone}`}
    >
      <div className="overflow-x-auto">
        <div
          className="grid items-center gap-x-1 gap-y-1.5"
          style={{
            gridTemplateColumns: `48px repeat(${hours.length}, minmax(28px, 1fr)) 44px`,
          }}
        >
          {/* Header — labels de hora */}
          <div />
          {hours.map((h) => (
            <div
              key={`hh-${h}`}
              className={`pb-1 text-center font-mono ${
                isHourBoundary(h)
                  ? "text-[10px] font-semibold text-[var(--color-text-secondary)]"
                  : "text-[10px] text-[var(--color-text-tertiary)]"
              }`}
            >
              {h}h
            </div>
          ))}
          <div
            className="pb-1 text-right text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
            title="Total por linha (à direita) e por coluna (em baixo)"
          >
            Total
          </div>

          {/* Linhas: dia + 14 cells + total */}
          {DAYS.map((dow) => {
            const rowSum = rowTotals.get(dow) ?? 0;
            const weekend = isWeekend(dow);
            return (
              <ContainerRow key={dow} weekend={weekend}>
                <div
                  className={`pr-2 text-right text-xs font-medium ${
                    weekend
                      ? "text-[var(--color-text-tertiary)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {DAY_LABELS[dow]}
                </div>
                {hours.map((hour) => {
                  const cell = cells.get(`${dow}_${hour}`);
                  const value = cell?.count ?? 0;
                  const isHotspotCell =
                    hotspot && hotspot.dow === dow && hotspot.hour === hour && value > 0;
                  const showHotspotRing =
                    isHotspotCell && total >= SPARSE_DATA_THRESHOLD;
                  const boundary = isHourBoundary(hour);
                  const level = getIntensityLevel(value, max, total);

                  // Tooltip com datas concretas (formatadas no render)
                  let titleText: string;
                  let inlineText: string | null = null;
                  if (value === 0) {
                    titleText = `${DAY_LABELS[dow]} ${hour}h: sem dados`;
                  } else if (value === 1 && cell?.timestamps[0] !== undefined) {
                    const dateLabel = formatDayMonth(new Date(cell.timestamps[0]));
                    titleText = `${DAY_LABELS[dow]} ${hour}h · 1 insight em ${dateLabel}`;
                    inlineText = dateLabel; // "29 abr" dentro da célula
                  } else if (cell) {
                    // Sort numérico por timestamp + dedupe por dia (yyyy-mm-dd)
                    const uniqueByDay = new Map<string, number>();
                    for (const ts of cell.timestamps) {
                      const dayKey = new Date(ts).toISOString().split("T")[0];
                      if (!uniqueByDay.has(dayKey)) uniqueByDay.set(dayKey, ts);
                    }
                    const sortedTs = Array.from(uniqueByDay.values()).sort((a, b) => a - b);
                    const uniqueDates = sortedTs.map((ts) => formatDayMonth(new Date(ts)));
                    titleText = `${DAY_LABELS[dow]} ${hour}h · ${value} insights · ${uniqueDates.join(", ")}`;
                    inlineText = String(value);
                  } else {
                    titleText = `${DAY_LABELS[dow]} ${hour}h`;
                  }

                  return (
                    <div
                      key={hour}
                      className={`relative ${
                        boundary ? "ml-2 border-l border-[var(--color-border)] pl-1" : ""
                      }`}
                    >
                      <div
                        className={`flex h-7 items-center justify-center rounded-md font-mono text-[9px] font-semibold leading-none transition-all duration-150 hover:scale-110 hover:ring-2 hover:ring-[var(--color-text-secondary)]/30 ${INTENSITY_BG[level]} ${INTENSITY_TEXT[level]} ${showHotspotRing ? "ring-2 ring-[var(--color-danger)]" : ""}`}
                        title={titleText}
                      >
                        {inlineText}
                      </div>
                    </div>
                  );
                })}
                <div
                  className={`pl-2 text-right font-mono text-xs ${
                    rowSum > 0
                      ? "font-semibold text-[var(--color-text)]"
                      : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {rowSum || "·"}
                </div>
              </ContainerRow>
            );
          })}

          {/* Footer — totais por hora */}
          <div
            className="pt-1 pr-2 text-right text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
            title="Total da hora — soma vertical de todos os dias da semana"
          >
            Total
          </div>
          {hours.map((hour) => {
            const colSum = colTotals.get(hour) ?? 0;
            const boundary = isHourBoundary(hour);
            return (
              <div
                key={`col-${hour}`}
                className={`pt-1 text-center font-mono text-[10px] ${
                  colSum > 0
                    ? "font-semibold text-[var(--color-text)]"
                    : "text-[var(--color-text-tertiary)]"
                } ${boundary ? "ml-2 pl-1" : ""}`}
              >
                {colSum || "·"}
              </div>
            );
          })}
          <div className="pt-1 pl-2 text-right font-mono text-xs font-semibold text-[var(--color-text)]">
            {total}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-secondary)]">
        <span>Volume menor</span>
        <div className="flex gap-1">
          <span className="block h-3.5 w-3.5 rounded bg-[var(--color-surface-2)]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#A6E3DC]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#5CC9BD]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#FFB370]" />
          <span className="block h-3.5 w-3.5 rounded bg-[var(--color-warning)]" />
          <span className="block h-3.5 w-3.5 rounded bg-[var(--color-danger)]" />
        </div>
        <span>Volume maior</span>
        <span className="ml-auto text-[var(--color-text-tertiary)]">
          {total} insights · pico em{" "}
          {hotspot ? `${DAY_LABELS[hotspot.dow]} ${hotspot.hour}h (${hotspot.count})` : "—"}
        </span>
      </div>

      {/* Insight automático ou aviso de cobertura insuficiente */}
      {showInsight && hotspot ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] p-3">
          <TriangleAlert
            className="h-5 w-5 flex-shrink-0 text-[var(--color-warning)]"
            aria-hidden="true"
          />
          <p className="flex-1 text-sm text-[var(--color-text)]">
            <strong className="font-semibold text-[var(--color-warning)]">
              {DAY_LABELS[hotspot.dow]} às {hotspot.hour}h
            </strong>{" "}
            concentra o maior volume da janela ({hotspot.count} de {total}
            {hotspot.timestamps.length > 0 ? (
              <>
                {" "}· datas:{" "}
                <span className="font-mono text-xs">
                  {(() => {
                    const uniqueByDay = new Map<string, number>();
                    for (const ts of hotspot.timestamps) {
                      const key = new Date(ts).toISOString().split("T")[0];
                      if (!uniqueByDay.has(key)) uniqueByDay.set(key, ts);
                    }
                    const sortedTs = Array.from(uniqueByDay.values()).sort(
                      (a, b) => a - b,
                    );
                    const labels = sortedTs.map((ts) =>
                      formatDayMonth(new Date(ts)),
                    );
                    const shown = labels.slice(0, 4);
                    return labels.length > 4
                      ? `${shown.join(", ")}…`
                      : shown.join(", ");
                  })()}
                </span>
              </>
            ) : null}
            ). Considere reforçar equipe ou ativar auto-resposta de boas-vindas
            nesse horário.
          </p>
        </div>
      ) : total < SPARSE_DATA_THRESHOLD ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/50 p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text)]">
              Cobertura ainda insuficiente
            </strong>{" "}
            — apenas {total} insight{total === 1 ? "" : "s"} em{" "}
            {windowDays} dias. Padrões de horário ficam confiáveis a partir de{" "}
            {SPARSE_DATA_THRESHOLD}+ insights na janela.
          </p>
        </div>
      ) : null}
    </SectionWrapper>
  );
}
