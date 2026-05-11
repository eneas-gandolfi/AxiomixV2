/**
 * Arquivo: src/components/dashboard/dashboard-charts-section.tsx
 * Propósito: Seção de gráficos do dashboard carregada com Suspense independente.
 *
 *            Fase 5 (2026-05-13): troca a varredura de 5000 linhas + agregação
 *            em JS pela RPC `dashboard_sentiment_trend_30d`. Retorna 30 linhas
 *            agregadas, com zeros para dias sem dado.
 */

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardSentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import {
  SentimentOverview,
  type SentimentOverviewData,
} from "@/components/dashboard/sentiment-overview";
import type { SentimentTrendDataPoint } from "@/types/modules/dashboard.types";

export async function DashboardChartsSection({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: trendRows, error } = await supabase.rpc(
    "dashboard_sentiment_trend_30d",
    { p_company_id: companyId },
  );

  if (error || !trendRows) {
    // Em caso de falha, renderiza graficos vazios — o componente nao quebra
    // a pagina inteira.
    return (
      <>
        <section>
          <DashboardSentimentTrendChart data={[]} />
        </section>
        <section>
          <SentimentOverview
            data={{ positive: 0, neutral: 0, negative: 0, total: 0 }}
          />
        </section>
      </>
    );
  }

  // RPC ja retorna 30 linhas em ordem cronologica. `day` vem como ISO date
  // (YYYY-MM-DD) — mesma forma que o chart espera em `date`.
  const sentimentTrendData: SentimentTrendDataPoint[] = trendRows.map((row) => ({
    date: row.day,
    positivo: row.positivo,
    neutro: row.neutro,
    negativo: row.negativo,
  }));

  // SentimentOverview soma os ultimos 7 dias do mesmo set.
  const last7 = sentimentTrendData.slice(-7);
  const sentimentData: SentimentOverviewData = last7.reduce<SentimentOverviewData>(
    (acc, row) => ({
      positive: acc.positive + row.positivo,
      neutral: acc.neutral + row.neutro,
      negative: acc.negative + row.negativo,
      total: acc.total + row.positivo + row.neutro + row.negativo,
    }),
    { positive: 0, neutral: 0, negative: 0, total: 0 },
  );

  return (
    <>
      <section>
        <DashboardSentimentTrendChart data={sentimentTrendData} />
      </section>

      <section>
        <SentimentOverview data={sentimentData} />
      </section>
    </>
  );
}
