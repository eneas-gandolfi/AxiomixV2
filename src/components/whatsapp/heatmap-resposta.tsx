/**
 * Arquivo: src/components/whatsapp/heatmap-resposta.tsx
 * Proposito: Heatmap "chegada vs resposta" — 7 dias x 24 horas. Cada celula
 *            mostra volume de inbounds e marca em hachura quando TFR mediano
 *            excedeu o SLA (gap). Diferente do AnaliseHeatmap que mostra
 *            apenas volume; esse mostra ONDE a equipe ficou devendo.
 *
 *            Fonte: messages dos ultimos N dias com direction normalizada.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  computeResponseHeatmap,
  DAY_LABEL,
  DAY_ORDER,
  type HeatmapCell,
  type DayKey,
} from "@/lib/whatsapp/heatmap-resposta";
import {
  DEFAULT_SLA_SECONDS,
  type MessageLight,
} from "@/lib/whatsapp/pulso-comercial";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 30;
const MESSAGE_SCAN_LIMIT = 8000;

function intensityClass(count: number, max: number): string {
  if (count === 0) return "bg-[var(--color-surface-2)]";
  const ratio = count / max;
  if (ratio >= 0.75) return "bg-[#D4621E]";
  if (ratio >= 0.5) return "bg-[#E8782F]";
  if (ratio >= 0.25) return "bg-[#F2C29B]";
  return "bg-[#F8E0CB]";
}

export async function HeatmapRespostaCard({
  companyId,
}: {
  companyId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS).toISOString();

  const { data } = await supabase
    .from("messages")
    .select("conversation_id, direction, sent_at")
    .eq("company_id", companyId)
    .gte("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(MESSAGE_SCAN_LIMIT);

  const messages: MessageLight[] = (data ?? [])
    .filter((m): m is { conversation_id: string; direction: string | null; sent_at: string } =>
      Boolean(m.conversation_id) && Boolean(m.sent_at),
    )
    .map((m) => ({
      conversationId: m.conversation_id,
      direction: m.direction,
      sentAt: m.sent_at,
    }));

  const heatmap = computeResponseHeatmap(messages, DEFAULT_SLA_SECONDS);
  const totalInbounds = heatmap.cells.reduce((sum, c) => sum + c.inboundCount, 0);

  if (totalInbounds === 0) {
    return (
      <SectionWrapper
        number={7}
        question="Que horas o time fica devendo?"
        subtitle="Heatmap aparece quando houver mensagens recebidas nos últimos 30 dias."
      >
        <p className="py-5 text-center text-[12.5px] italic text-[var(--color-text-tertiary)]">
          Sem mensagens recebidas no período.
        </p>
      </SectionWrapper>
    );
  }

  const maxCount = heatmap.cells.reduce((m, c) => Math.max(m, c.inboundCount), 0);
  const cellsByDay = new Map<DayKey, HeatmapCell[]>();
  for (const cell of heatmap.cells) {
    const list = cellsByDay.get(cell.day) ?? [];
    list.push(cell);
    cellsByDay.set(cell.day, list);
  }

  const peakLabel = heatmap.peakCell
    ? `${DAY_LABEL[heatmap.peakCell.day]} ${String(heatmap.peakCell.hour).padStart(2, "0")}h`
    : null;
  const gapLabel = heatmap.worstGap
    ? `${DAY_LABEL[heatmap.worstGap.day]} ${String(heatmap.worstGap.hour).padStart(2, "0")}h`
    : null;

  return (
    <SectionWrapper
      number={7}
      question="Que horas o time fica devendo?"
      subtitle={
        gapLabel
          ? `Pico de chegada: ${peakLabel}. Pior gap (TFR > SLA): ${gapLabel}. Hachura = leads chegaram, ninguém respondeu no SLA.`
          : `Pico de chegada: ${peakLabel}. Nenhum gap critico — equipe respondeu dentro do SLA em todas as faixas.`
      }
    >
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="ml-7 mb-0.5 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px text-[8.5px] text-[var(--color-text-tertiary)]">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center">
                {h % 3 === 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>

          <div className="space-y-px">
            {DAY_ORDER.map((day) => {
              const dayCells = cellsByDay.get(day) ?? [];
              return (
                <div key={day} className="flex items-center gap-1">
                  <div className="w-6 flex-shrink-0 text-right text-[9.5px] font-semibold text-[var(--color-text-tertiary)]">
                    {DAY_LABEL[day]}
                  </div>
                  <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
                    {dayCells.map((cell) => {
                      const tone = intensityClass(cell.inboundCount, maxCount);
                      const titleParts = [
                        `${DAY_LABEL[cell.day]} ${String(cell.hour).padStart(2, "0")}h`,
                        cell.inboundCount === 0
                          ? "sem chegadas"
                          : `${cell.inboundCount} ${cell.inboundCount === 1 ? "lead" : "leads"}`,
                      ];
                      if (cell.medianTfrSec !== null) {
                        titleParts.push(`TFR mediano ${Math.round(cell.medianTfrSec / 60)}min`);
                      }
                      if (cell.isGap) titleParts.push("gap (TFR > SLA)");
                      return (
                        <div
                          key={`${cell.day}_${cell.hour}`}
                          className={`relative aspect-square min-h-[12px] rounded-[2px] ${tone}`}
                          title={titleParts.join(" · ")}
                        >
                          {cell.isGap ? (
                            <span
                              className="absolute inset-0 rounded-[2px]"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, rgba(169,61,42,0.55) 0 2px, transparent 2px 5px)",
                              }}
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-tertiary)]">
        <div className="flex items-center gap-1">
          <span>menor</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#F8E0CB]" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#F2C29B]" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#E8782F]" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-[#D4621E]" />
          <span>maior · volume</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(169,61,42,0.65) 0 2px, #F8E0CB 2px 5px)",
            }}
          />
          <span>gap: chegou, ninguém respondeu no SLA</span>
        </div>
      </div>
    </SectionWrapper>
  );
}

export function HeatmapRespostaCardSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="mb-3 h-4 w-60 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="h-32 animate-pulse rounded-md bg-[var(--color-surface-2)]" />
    </section>
  );
}
