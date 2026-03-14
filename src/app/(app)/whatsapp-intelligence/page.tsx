/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/page.tsx
 * Propósito: Dashboard de métricas do WhatsApp Intelligence (sentimento, intenções, tendências).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCardWithSparkline } from "@/components/whatsapp/metric-card-with-sparkline";
import { SentimentTrendChart } from "@/components/whatsapp/sentiment-trend-chart";
import { IntentDistributionChart } from "@/components/whatsapp/intent-distribution-chart";
import { SyncConversationsButton } from "@/components/whatsapp/sync-conversations-button";
import { BulkAnalyzeButton } from "@/components/whatsapp/bulk-analyze-button";

export default async function WhatsAppDashboardPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const { data: recentInsights } = await supabase
    .from("conversation_insights")
    .select("sentiment, intent, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", sevenDaysAgo.toISOString());

  const { data: previousInsights } = await supabase
    .from("conversation_insights")
    .select("sentiment, intent, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", fourteenDaysAgo.toISOString())
    .lt("generated_at", sevenDaysAgo.toISOString());

  const { data: thirtyDaysInsights } = await supabase
    .from("conversation_insights")
    .select("sentiment, intent, generated_at")
    .eq("company_id", companyId)
    .gte("generated_at", thirtyDaysAgo.toISOString());

  // Métricas
  const totalAnalyzed = (recentInsights ?? []).length;
  const sentimentCounts = {
    positivo: (recentInsights ?? []).filter((i) => i.sentiment === "positivo").length,
    neutro: (recentInsights ?? []).filter((i) => i.sentiment === "neutro").length,
    negativo: (recentInsights ?? []).filter((i) => i.sentiment === "negativo").length,
  };

  const intentCounts: Record<string, number> = {};
  for (const insight of recentInsights ?? []) {
    if (insight.intent) {
      intentCounts[insight.intent] = (intentCounts[insight.intent] ?? 0) + 1;
    }
  }
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0];

  // Conversas negativas que precisam de atenção (últimas 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: criticalConversations } = await supabase
    .from("conversation_insights")
    .select("conversation_id")
    .eq("company_id", companyId)
    .eq("sentiment", "negativo")
    .gte("generated_at", oneDayAgo.toISOString());

  const criticalCount = (criticalConversations ?? []).length;

  // Variação vs período anterior
  const totalAnalyzedPrevious = (previousInsights ?? []).length;

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  };

  const totalVariation = calculateVariation(totalAnalyzed, totalAnalyzedPrevious);

  // Sparklines (últimos 7 dias)
  const sparklineMap = new Map<string, number>();
  for (const insight of recentInsights ?? []) {
    if (!insight.generated_at) continue;
    const date = new Date(insight.generated_at).toISOString().split("T")[0];
    sparklineMap.set(date, (sparklineMap.get(date) ?? 0) + 1);
  }

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    last7Days.push(date.toISOString().split("T")[0]);
  }

  const sparklineData = last7Days.map((date) => ({
    value: sparklineMap.get(date) ?? 0,
  }));

  // Tendência de sentimento (30 dias)
  const sentimentByDate = new Map<string, { positivo: number; neutro: number; negativo: number }>();

  for (const insight of thirtyDaysInsights ?? []) {
    if (!insight.generated_at || !insight.sentiment) continue;
    const date = new Date(insight.generated_at).toISOString().split("T")[0];
    const current = sentimentByDate.get(date) ?? { positivo: 0, neutro: 0, negativo: 0 };

    if (insight.sentiment === "positivo") {
      current.positivo++;
    } else if (insight.sentiment === "neutro") {
      current.neutro++;
    } else if (insight.sentiment === "negativo") {
      current.negativo++;
    }

    sentimentByDate.set(date, current);
  }

  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    last30Days.push(date.toISOString().split("T")[0]);
  }

  const sentimentTrendData = last30Days.map((date) => {
    const data = sentimentByDate.get(date) ?? { positivo: 0, neutro: 0, negativo: 0 };
    return {
      date,
      positivo: data.positivo,
      neutro: data.neutro,
      negativo: data.negativo,
    };
  });

  // Distribuição de intenções
  const intentDistributionData = Object.entries(intentCounts)
    .map(([name, value]) => ({
      name,
      value,
      color: "",
    }))
    .sort((a, b) => b.value - a.value);

  if (totalAnalyzed === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-lg font-medium text-text">Nenhuma análise nos últimos 7 dias</p>
        <p className="mt-2 text-sm text-muted">
          Sincronize conversas e analise com IA para ver métricas aqui.
        </p>
        <div className="mt-6 flex gap-2">
          <BulkAnalyzeButton companyId={companyId} />
          <SyncConversationsButton companyId={companyId} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Ações rápidas */}
      <div className="mb-6 flex justify-end gap-2">
        <BulkAnalyzeButton companyId={companyId} />
        <SyncConversationsButton companyId={companyId} />
      </div>

      {/* Métricas com sparklines */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardWithSparkline
          title="Conversas analisadas"
          value={totalAnalyzed}
          subtitle="Últimos 7 dias"
          icon="sparkles"
          sparklineData={sparklineData}
          change={totalVariation}
        />

        <MetricCardWithSparkline
          title="Positivas"
          value={sentimentCounts.positivo}
          subtitle={`${Math.round((sentimentCounts.positivo / totalAnalyzed) * 100)}% do total`}
          color="success"
          sparklineData={sparklineData}
        />

        <MetricCardWithSparkline
          title="Principal intenção"
          value={topIntent?.[1] ?? 0}
          subtitle={topIntent?.[0] ? topIntent[0].charAt(0).toUpperCase() + topIntent[0].slice(1) : "Nenhuma"}
          icon="target"
          color="primary"
        />

        <MetricCardWithSparkline
          title="Precisam de atenção"
          value={criticalCount}
          subtitle="Negativas nas últimas 24h"
          icon="alert"
          color={criticalCount > 0 ? "danger" : undefined}
          className={criticalCount > 0 ? "border-danger" : ""}
        />
      </div>

      {/* Gráficos de análise */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SentimentTrendChart data={sentimentTrendData} />
        <IntentDistributionChart data={intentDistributionData} />
      </div>
    </>
  );
}
