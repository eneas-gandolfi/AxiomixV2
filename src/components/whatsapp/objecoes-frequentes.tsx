/**
 * Arquivo: src/components/whatsapp/objecoes-frequentes.tsx
 * Proposito: Renderiza ranking das objecoes mais frequentes — categorizadas
 *            por keyword match (preco, prazo, garantia, frete, pagamento,
 *            qualidade, atendimento, outros). Os 3 primeiros exemplos brutos
 *            de cada categoria aparecem como tooltip via title.
 *
 *            Fonte: conversation_insights.objections (jsonb populado pela IA).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { ShieldAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  aggregateObjections,
  parseObjectionsField,
} from "@/lib/whatsapp/objecoes";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 30;

export async function ObjecoesFrequentesCard({
  companyId,
}: {
  companyId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS).toISOString();

  const { data } = await supabase
    .from("conversation_insights")
    .select("objections")
    .eq("company_id", companyId)
    .gte("generated_at", since);

  const objectionsPerInsight: string[][] = (data ?? []).map((row) =>
    parseObjectionsField(row.objections),
  );

  const buckets = aggregateObjections({ objectionsPerInsight });
  const totalObjections = buckets.reduce((sum, b) => sum + b.count, 0);
  const maxCount = buckets[0]?.count ?? 1;

  if (totalObjections === 0) {
    return (
      <SectionWrapper
        icon={ShieldAlert}
        question="Quais são as objeções mais frequentes?"
        subtitle={`Ranking aparece quando houver objeções extraídas nos últimos ${LOOKBACK_DAYS} dias.`}
      >
        <p className="py-5 text-center text-[12.5px] italic text-[var(--color-text-tertiary)]">
          Nenhuma objeção catalogada ainda.
        </p>
      </SectionWrapper>
    );
  }

  const topLabel = buckets[0]?.label ?? "—";

  return (
    <SectionWrapper
      icon={ShieldAlert}
      question="Quais são as objeções mais frequentes?"
      subtitle={`Tema mais barrado: "${topLabel}". Aja primeiro nele — quanto mais frequente, maior o ROI do treinamento.`}
    >
      <ul className="space-y-1.5">
        {buckets.map((bucket) => {
          const width = (bucket.count / maxCount) * 100;
          const examplesTitle = bucket.examples.join(" · ");
          return (
            <li key={bucket.categoria} className="flex items-center gap-2.5">
              <div className="w-24 flex-shrink-0 text-[12.5px] font-semibold leading-tight text-[var(--color-text)]">
                {bucket.label}
              </div>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E8782F] to-[#D4621E]"
                  style={{ width: `${width}%` }}
                  title={examplesTitle}
                />
              </div>
              <div className="w-8 flex-shrink-0 text-right font-mono text-[12.5px] font-bold tabular-nums text-[var(--color-text-secondary)]">
                {bucket.count}
              </div>
            </li>
          );
        })}
      </ul>

      {buckets[0]?.examples.length ? (
        <div className="mt-3 rounded-md bg-[var(--color-surface-2)] px-2.5 py-1.5">
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Exemplos recentes — {topLabel}
          </p>
          <ul className="mt-0.5 space-y-0">
            {buckets[0].examples.map((ex, i) => (
              <li
                key={i}
                className="truncate text-[11px] italic leading-snug text-[var(--color-text-secondary)]"
              >
                “{ex}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionWrapper>
  );
}

export function ObjecoesFrequentesCardSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="mb-3 h-4 w-60 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-[var(--color-surface-2)]" />
        ))}
      </div>
    </section>
  );
}
