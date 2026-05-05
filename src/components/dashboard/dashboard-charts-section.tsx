/**
 * Arquivo: src/components/dashboard/dashboard-charts-section.tsx
 * Propósito: Seção de gráficos do dashboard carregada com Suspense independente.
 */

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardSentimentTrendChart } from "@/components/dashboard/sentiment-trend-chart";
import {
  SentimentOverview,
  type SentimentOverviewData,
} from "@/components/dashboard/sentiment-overview";
import type { SentimentTrendDataPoint } from "@/types/modules/dashboard.types";

const DAY_MS = 86_400_000;

export async function DashboardChartsSection({ companyId }: { companyId: string }) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const nowIso = now.toISOString();

  const sentimentTrendResult = await supabase
    .from("conversation_insights")
    .select("sentiment, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", thirtyDaysAgoIso)
    .lte("generated_at", nowIso)
    .limit(5000);

  // Sentiment trend (30 dias)
  const allSentiments = sentimentTrendResult.data ?? [];
  const sevenDaysAgoDate = new Date(sevenDaysAgoIso);

  const sentimentByDate = new Map<string, { positivo: number; neutro: number; negativo: number }>();
  for (const insight of allSentiments) {
    if (!insight.generated_at || !insight.sentiment) continue;
    const dateKey = new Date(insight.generated_at).toISOString().split("T")[0];
    const current = sentimentByDate.get(dateKey) ?? { positivo: 0, neutro: 0, negativo: 0 };
    if (insight.sentiment === "positivo") current.positivo++;
    else if (insight.sentiment === "neutro") current.neutro++;
    else if (insight.sentiment === "negativo") current.negativo++;
    sentimentByDate.set(dateKey, current);
  }

  const sentimentTrendData: SentimentTrendDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS).toISOString().split("T")[0];
    const counts = sentimentByDate.get(date) ?? { positivo: 0, neutro: 0, negativo: 0 };
    sentimentTrendData.push({ date, ...counts });
  }

  const recentSentiments = allSentiments.filter(
    (s) => s.generated_at && new Date(s.generated_at) >= sevenDaysAgoDate
  );
  const sentimentData: SentimentOverviewData = {
    positive: recentSentiments.filter((s) => s.sentiment === "positivo").length,
    neutral: recentSentiments.filter((s) => s.sentiment === "neutro").length,
    negative: recentSentiments.filter((s) => s.sentiment === "negativo").length,
    total: recentSentiments.length,
  };

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
