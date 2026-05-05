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

function buildHourRange(): number[] {
  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);
  return hours;
}

/** Threshold: abaixo disso usamos escala absoluta (cada célula com 1-2 não vira
 *  vermelho só porque é o max). Acima disso usamos relativa (% do max). */
const SPARSE_DATA_THRESHOLD = 10;

function intensityClass(value: number, max: number, total: number): string {
  if (max === 0 || value === 0) return "bg-[var(--color-surface-2)]";

  // Volume total muito baixo → escala absoluta, evita pintar tudo de vermelho
  if (total < SPARSE_DATA_THRESHOLD) {
    if (value >= 5) return "bg-[var(--color-danger)]";
    if (value >= 3) return "bg-[var(--color-warning)]";
    if (value >= 2) return "bg-[#FFB370]";
    return "bg-[#A6E3DC]"; // 1 = mais claro
  }

  // Escala relativa quando há dados suficientes
  const ratio = value / max;
  if (ratio >= 0.85) return "bg-[var(--color-danger)]";
  if (ratio >= 0.65) return "bg-[var(--color-warning)]";
  if (ratio >= 0.4) return "bg-[#FFB370]";
  if (ratio >= 0.2) return "bg-[#5CC9BD]";
  return "bg-[#A6E3DC]";
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

  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();

  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", since);

  const cells = new Map<CellKey, number>();

  for (const insight of insights ?? []) {
    if (!insight.generated_at) continue;
    const z = toZonedDate(new Date(insight.generated_at), timezone);
    if (z.hour < HOUR_START || z.hour >= HOUR_END) continue;
    const key: CellKey = `${z.dow}_${z.hour}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }

  // Encontra hotspot (cell com mais volume) pra insight automático
  let hotspot: { dow: DayOfWeek; hour: number; count: number } | null = null;
  for (const [key, count] of cells.entries()) {
    if (!hotspot || count > hotspot.count) {
      const [dow, hour] = key.split("_") as [DayOfWeek, string];
      hotspot = { dow, hour: parseInt(hour, 10), count };
    }
  }

  const max = hotspot?.count ?? 0;
  const total = Array.from(cells.values()).reduce((s, v) => s + v, 0);

  if (total === 0) {
    return (
      <SectionWrapper number={4} question="Algum padrão de horário preocupante?">
        <p className="py-8 text-center text-sm italic text-[var(--color-text-tertiary)]">
          O mapa de calor aparece quando houver insights nos últimos {windowDays}{" "}
          dias.
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

  return (
    <SectionWrapper
      number={4}
      question="Algum padrão de horário preocupante?"
      subtitle={`Volume de insights por dia × hora · janela ${windowDays} dias · fuso ${timezone}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="w-12" />
              {hours.map((h) => (
                <th
                  key={h}
                  className="pb-2 text-center font-mono text-[10px] text-[var(--color-text-tertiary)]"
                >
                  {h}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dow) => (
              <tr key={dow}>
                <th className="pr-2 text-right text-xs font-medium text-[var(--color-text-secondary)]">
                  {DAY_LABELS[dow]}
                </th>
                {hours.map((hour) => {
                  const value = cells.get(`${dow}_${hour}`) ?? 0;
                  const isHotspot =
                    hotspot && hotspot.dow === dow && hotspot.hour === hour && value > 0;
                  // Não destaca o "hotspot" quando dataset é esparso — não há
                  // hot spot real, é só falta de dados.
                  const showHotspotRing =
                    isHotspot && total >= SPARSE_DATA_THRESHOLD;
                  return (
                    <td key={hour} className="p-0.5">
                      <div
                        className={`aspect-square rounded ${intensityClass(value, max, total)} ${showHotspotRing ? "ring-2 ring-[var(--color-danger)]" : ""}`}
                        title={
                          value > 0
                            ? `${DAY_LABELS[dow]} ${hour}h: ${value} insight${value === 1 ? "" : "s"}`
                            : `${DAY_LABELS[dow]} ${hour}h: sem dados`
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
          {total} insights · pico em {hotspot ? `${DAY_LABELS[hotspot.dow]} ${hotspot.hour}h (${hotspot.count})` : "—"}
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
            concentra o maior volume da janela ({hotspot.count} de {total}).
            Considere reforçar equipe ou ativar auto-resposta de boas-vindas
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
