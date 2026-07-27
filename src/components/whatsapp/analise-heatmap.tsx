/**
 * Arquivo: src/components/whatsapp/analise-heatmap.tsx
 * Propósito: §4 da aba Análise — "Algum padrão de horário preocupante?".
 *            Heatmap dia-da-semana × faixa de 2h: intensidade = volume de
 *            leads que chegaram (inbound), hachura vermelha = TFR mediano da
 *            célula estourou o SLA do nicho. Substitui o proxy de volume de
 *            insights da v1 e absorve o antigo HeatmapRespostaCard (fundidos).
 * Autor: AXIOMIX
 * Data: 2026-05-07 (v2 TFR: 2026-07-27)
 */

import { Flame, TriangleAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toZonedDate } from "@/lib/whatsapp/business-hours";
import {
  computeResponseHeatmap,
  DAY_ORDER,
  type DayKey,
  type HeatmapCell,
} from "@/lib/whatsapp/heatmap-resposta";
import { DEFAULT_SLA_SECONDS, type MessageLight } from "@/lib/whatsapp/pulso-comercial";
import { getNicheBySlug, type NicheSlug } from "@/lib/niches";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const HOUR_START = 8;
const HOUR_END = 22; // exclusive — cobre das 8h às 21h
const BUCKET_SIZE = 2; // 7 colunas: 8-9h, 10-11h, ..., 20-21h
const MESSAGE_SCAN_LIMIT = 8000;

function bucketLabel(start: number): string {
  return `${start}-${start + BUCKET_SIZE - 1}h`;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

function buildHourRange(): number[] {
  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h += BUCKET_SIZE) hours.push(h);
  return hours;
}

/** Formata TFR em segundos como "45s", "12min" ou "1h30". */
function formatTfr(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

/** Threshold: abaixo disso usamos escala absoluta (cada célula com 1-2 não vira
 *  escura só porque é o max). Acima disso usamos relativa (% do max). */
const SPARSE_DATA_THRESHOLD = 10;

/**
 * Wrapper que faz a linha do heatmap se distribuir no mesmo subgrid do
 * container pai (`subgrid` em col), permitindo aplicar fundo discreto pro
 * fim de semana sem quebrar o alinhamento das colunas.
 *
 * O destaque de "hoje" vive APENAS na label da linha (badge + cor) — a
 * row em si não ganha decoração pra não parecer estado de seleção.
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

type IntensityLevel = "empty" | "subtle" | "low" | "mid" | "high";

/** Intensidade pela quantidade de leads que chegaram na célula. Gap (SLA
 *  estourado) é sinalizado por ring vermelho, não pela escala de cor —
 *  volume e qualidade de resposta são dimensões independentes. */
function getIntensityLevel(
  value: number,
  max: number,
  total: number,
): IntensityLevel {
  if (max === 0 || value === 0) return "empty";
  if (total < SPARSE_DATA_THRESHOLD) {
    if (value >= 4) return "high";
    if (value >= 2) return "mid";
    return "subtle";
  }
  const ratio = value / max;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.45) return "mid";
  if (ratio >= 0.2) return "low";
  return "subtle";
}

const INTENSITY_BG: Record<IntensityLevel, string> = {
  empty: "bg-[var(--color-surface-2)]",
  subtle: "bg-[#A6E3DC]",
  low: "bg-[#5CC9BD]",
  mid: "bg-[#2FA79A]",
  high: "bg-[#0F4F49]",
};

/** Cor do texto que aparece DENTRO da célula. Branco em fundos escuros,
 *  preto em fundos claros. */
const INTENSITY_TEXT: Record<IntensityLevel, string> = {
  empty: "text-[var(--color-text-tertiary)]",
  subtle: "text-[#0F4F49]",
  low: "text-[#0F4F49]",
  mid: "text-white",
  high: "text-white",
};

export async function AnaliseHeatmap({
  companyId,
  windowDays = 30,
}: {
  companyId: string;
  windowDays?: number;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("timezone, niche_slug")
    .eq("id", companyId)
    .maybeSingle();
  const timezone = company?.timezone ?? "America/Sao_Paulo";
  const niche = company?.niche_slug
    ? getNicheBySlug(company.niche_slug as NicheSlug)
    : null;
  const slaSeconds = niche?.thresholdAmberSeconds ?? DEFAULT_SLA_SECONDS;

  const sinceDate = new Date(Date.now() - windowDays * DAY_MS);
  const since = sinceDate.toISOString();

  const { data } = await supabase
    .from("messages")
    .select("conversation_id, direction, sent_at")
    .eq("company_id", companyId)
    .gte("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(MESSAGE_SCAN_LIMIT);

  const messages: MessageLight[] = (data ?? [])
    .filter(
      (m): m is { conversation_id: string; direction: string | null; sent_at: string } =>
        Boolean(m.conversation_id) && Boolean(m.sent_at),
    )
    .map((m) => ({
      conversationId: m.conversation_id,
      direction: m.direction,
      sentAt: m.sent_at,
    }));

  const heatmap = computeResponseHeatmap(messages, slaSeconds, {
    timezone,
    bucketSizeHours: BUCKET_SIZE,
    hourStart: HOUR_START,
    hourEnd: HOUR_END,
  });

  const cellByKey = new Map<string, HeatmapCell>();
  for (const cell of heatmap.cells) {
    cellByKey.set(`${cell.day}_${cell.hour}`, cell);
  }

  // Formatadores no fuso do tenant. Usa "month: short" pra exibir nome
  // abreviado em PT-BR ("abr", "mai", "jun") em vez de numero.
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
    const month = monthParts.format(date).replace(/\.$/, "");
    return `${day} ${month}`;
  };

  const sinceLabel = formatDayMonth(sinceDate);
  const untilLabel = formatDayMonth(new Date());
  const rangeLabel = `${sinceLabel} → ${untilLabel}`;

  // Dia da semana de hoje (no fuso do tenant) — usado pra destacar a linha
  const todayDow = toZonedDate(new Date(), timezone).dow;

  const total = heatmap.cells.reduce((s, c) => s + c.inboundCount, 0);
  const max = heatmap.peakCell?.inboundCount ?? 0;

  if (total === 0) {
    return (
      <SectionWrapper icon={Flame} question="Algum padrão de horário preocupante?">
        <p className="py-8 text-center text-sm italic text-[var(--color-text-tertiary)]">
          O mapa de calor aparece quando houver mensagens recebidas entre{" "}
          {sinceLabel} e {untilLabel} ({windowDays} dias).
        </p>
      </SectionWrapper>
    );
  }

  const hours = buildHourRange();
  const gapCount = heatmap.cells.filter((c) => c.isGap).length;
  const worstGap = heatmap.worstGap;

  // Totais por linha (dia) e coluna (hora) — micro-summaries marginais
  const rowTotals = new Map<DayKey, number>();
  const colTotals = new Map<number, number>();
  for (const dow of DAY_ORDER) {
    let rowSum = 0;
    for (const hour of hours) {
      const v = cellByKey.get(`${dow}_${hour}`)?.inboundCount ?? 0;
      rowSum += v;
      colTotals.set(hour, (colTotals.get(hour) ?? 0) + v);
    }
    rowTotals.set(dow, rowSum);
  }

  // Boundaries semanticos: 12h = almoço, 18h = fim do expediente
  const isHourBoundary = (h: number) => h === 12 || h === 18;
  const isWeekend = (d: DayKey) => d === "sat" || d === "sun";

  return (
    <SectionWrapper
      icon={Flame}
      question="Algum padrão de horário preocupante?"
      subtitle={`Leads que chegaram por dia × faixa de horário · borda vermelha = resposta mediana acima do SLA (${formatTfr(slaSeconds)}) · ${windowDays} dias (${rangeLabel}) · fuso ${timezone}`}
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

          {/* Linhas: dia + cells + total */}
          {DAY_ORDER.map((dow) => {
            const rowSum = rowTotals.get(dow) ?? 0;
            const weekend = isWeekend(dow);
            const isToday = dow === todayDow;
            const labelClass = isToday
              ? "text-[var(--color-text)] font-semibold"
              : weekend
                ? "text-[var(--color-text-tertiary)] font-medium"
                : "text-[var(--color-text-secondary)] font-medium";
            return (
              <ContainerRow key={dow} weekend={weekend}>
                <div
                  className={`flex items-center justify-end gap-1.5 pr-2 text-xs ${labelClass}`}
                >
                  {DAY_LABELS[dow]}
                  {isToday ? (
                    <span
                      className="rounded bg-[var(--color-primary)]/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[var(--color-primary)]"
                      title="Hoje"
                    >
                      Hoje
                    </span>
                  ) : null}
                </div>
                {hours.map((hour) => {
                  const cell = cellByKey.get(`${dow}_${hour}`);
                  const value = cell?.inboundCount ?? 0;
                  const isGap = cell?.isGap ?? false;
                  const boundary = isHourBoundary(hour);
                  const level = getIntensityLevel(value, max, total);
                  const hourLabel = bucketLabel(hour);

                  let titleText: string;
                  if (value === 0) {
                    titleText = `${DAY_LABELS[dow]} ${hourLabel}: sem leads`;
                  } else {
                    const leadLabel = value === 1 ? "1 lead" : `${value} leads`;
                    const tfrLabel =
                      cell?.medianTfrSec != null
                        ? `TFR mediano ${formatTfr(cell.medianTfrSec)}`
                        : "sem resposta no período";
                    titleText = `${DAY_LABELS[dow]} ${hourLabel} · ${leadLabel} · ${tfrLabel}${
                      isGap ? ` · acima do SLA (${formatTfr(slaSeconds)})` : ""
                    }`;
                  }

                  return (
                    <div key={hour} className="relative">
                      {boundary ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -left-1 top-0 bottom-0 w-px bg-[var(--color-border)]"
                        />
                      ) : null}
                      <div
                        className={`flex h-7 items-center justify-center overflow-hidden whitespace-nowrap rounded-md font-mono text-[9px] font-semibold leading-none transition-all duration-150 hover:scale-110 hover:ring-2 hover:ring-[var(--color-text-secondary)]/30 ${INTENSITY_BG[level]} ${INTENSITY_TEXT[level]} ${isGap ? "ring-2 ring-inset ring-[var(--color-danger)]" : ""}`}
                        title={titleText}
                      >
                        {value > 0 ? value : null}
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
            title="Total da faixa — soma vertical de todos os dias da semana"
          >
            Total
          </div>
          {hours.map((hour) => {
            const colSum = colTotals.get(hour) ?? 0;
            return (
              <div
                key={`col-${hour}`}
                className={`pt-1 text-center font-mono text-[10px] ${
                  colSum > 0
                    ? "font-semibold text-[var(--color-text)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
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
        <span>Menos leads</span>
        <div className="flex gap-1">
          <span className="block h-3.5 w-3.5 rounded bg-[var(--color-surface-2)]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#A6E3DC]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#5CC9BD]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#2FA79A]" />
          <span className="block h-3.5 w-3.5 rounded bg-[#0F4F49]" />
        </div>
        <span>Mais leads</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="block h-3.5 w-3.5 rounded bg-[var(--color-surface-2)] ring-2 ring-inset ring-[var(--color-danger)]" />
          resposta acima do SLA
        </span>
        <span className="ml-auto text-[var(--color-text-tertiary)]">
          {total} leads · pico em{" "}
          {heatmap.peakCell
            ? `${DAY_LABELS[heatmap.peakCell.day]} ${bucketLabel(heatmap.peakCell.hour)} (${heatmap.peakCell.inboundCount})`
            : "—"}
        </span>
      </div>

      {/* Insight automático: pior gap de SLA, aviso de cobertura, ou tudo em dia */}
      {worstGap && total >= SPARSE_DATA_THRESHOLD ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3">
          <TriangleAlert
            className="h-5 w-5 flex-shrink-0 text-[var(--color-danger)]"
            aria-hidden="true"
          />
          <p className="flex-1 text-sm text-[var(--color-text)]">
            <strong className="font-semibold text-[var(--color-danger)]">
              {DAY_LABELS[worstGap.day]} {bucketLabel(worstGap.hour)}
            </strong>{" "}
            é onde mais escapa dinheiro:{" "}
            {worstGap.inboundCount === 1
              ? "1 lead chegou"
              : `${worstGap.inboundCount} leads chegaram`}{" "}
            e a resposta mediana foi{" "}
            {worstGap.medianTfrSec != null
              ? formatTfr(worstGap.medianTfrSec)
              : "nenhuma"}{" "}
            (SLA: {formatTfr(slaSeconds)})
            {gapCount > 1 ? ` — e mais ${gapCount - 1} faixa${gapCount > 2 ? "s" : ""} no vermelho` : ""}
            . Considere reforçar equipe ou ativar auto-resposta nesse horário.
          </p>
        </div>
      ) : total < SPARSE_DATA_THRESHOLD ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/50 p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text)]">
              Cobertura ainda insuficiente
            </strong>{" "}
            — apenas {total} lead{total === 1 ? "" : "s"} em {windowDays} dias.
            Padrões de horário ficam confiáveis a partir de{" "}
            {SPARSE_DATA_THRESHOLD}+ leads na janela.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text)]">SLA em dia</strong> —
            nenhuma faixa de horário com resposta mediana acima de{" "}
            {formatTfr(slaSeconds)} na janela.
          </p>
        </div>
      )}
    </SectionWrapper>
  );
}
