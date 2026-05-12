/**
 * Arquivo: src/components/whatsapp/funil-comercial.tsx
 * Proposito: Visualiza o funil comercial — Camada 2 da Inteligencia Comercial.
 *            Server Component que le sales_stage de conversation_insights e
 *            usa computeFunilFromInsights para acumulado por estagio + gargalo.
 *
 *            Estagios sao barras horizontais com largura proporcional ao topo.
 *            O estagio gargalo recebe outline danger e label "gargalo".
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { Filter, TriangleAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  computeFunilFromInsights,
  type InsightStageRow,
} from "@/lib/whatsapp/funil-comercial";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 30;

export async function FunilComercialCard({
  companyId,
}: {
  companyId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS).toISOString();

  const { data } = await supabase
    .from("conversation_insights")
    .select("conversation_id, sales_stage")
    .eq("company_id", companyId)
    .gte("generated_at", since);

  const insights: InsightStageRow[] = (data ?? []).map((row) => ({
    conversationId: row.conversation_id ?? "",
    salesStage: row.sales_stage,
  }));

  const funil = computeFunilFromInsights(insights);

  if (funil.totalAnalyzed === 0) {
    return (
      <SectionWrapper
        icon={Filter}
        question="Onde o funil está empoçando?"
        subtitle="Funil aparece quando houver insights gerados nos últimos 30 dias."
      >
        <p className="py-5 text-center text-[12.5px] italic text-[var(--color-text-tertiary)]">
          Ainda não há insights suficientes para montar o funil.
        </p>
      </SectionWrapper>
    );
  }

  const bottleneckLabel =
    funil.bottleneckIndex !== null
      ? funil.stages[funil.bottleneckIndex].label
      : null;

  return (
    <SectionWrapper
      icon={Filter}
      question="Onde o funil está empoçando?"
      subtitle={
        bottleneckLabel
          ? `Gargalo identificado em "${bottleneckLabel}" — queda de ${funil.bottleneckDropPp}pp em relação ao estágio anterior.`
          : "Distribuição acumulada das conversas por estágio (sales_stage do insight)."
      }
    >
      <ul className="space-y-1.5">
        {funil.stages.map((stage, idx) => {
          const isBottleneck = idx === funil.bottleneckIndex;
          const width = Math.max(4, stage.pctOfTop);
          return (
            <li key={stage.stage} className="flex items-center gap-2.5">
              <div className="w-24 flex-shrink-0 text-[11.5px] font-semibold leading-tight text-[var(--color-text-secondary)]">
                {stage.label}
                {isBottleneck ? (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-danger)]">
                    <TriangleAlert className="h-2.5 w-2.5" />
                    gargalo
                  </span>
                ) : null}
              </div>
              <div
                className={`relative h-5 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)] ${
                  isBottleneck ? "ring-1 ring-[var(--color-danger)]/40" : ""
                }`}
              >
                <div
                  className={`flex h-full items-center px-1.5 text-[10.5px] font-bold text-white ${
                    isBottleneck
                      ? "bg-gradient-to-r from-[#C97A5E] to-[var(--color-danger)]"
                      : "bg-gradient-to-r from-[#E8782F] to-[#D4621E]"
                  }`}
                  style={{ width: `${width}%` }}
                >
                  {width >= 18 ? `${stage.count}` : ""}
                </div>
              </div>
              <div className="w-9 flex-shrink-0 text-right font-mono text-[12.5px] font-bold tabular-nums text-[var(--color-text)]">
                {stage.count}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-dashed border-[var(--color-border)] pt-2 text-[10.5px] text-[var(--color-text-tertiary)]">
        Base: {funil.totalAnalyzed} conversas com insight nos últimos {LOOKBACK_DAYS} dias.
      </p>
    </SectionWrapper>
  );
}

export function FunilComercialCardSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="mb-3 h-4 w-60 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-[var(--color-surface-2)]" />
        ))}
      </div>
    </section>
  );
}
