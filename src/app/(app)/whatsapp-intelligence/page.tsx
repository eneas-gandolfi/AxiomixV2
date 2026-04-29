/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/page.tsx
 * Propósito: Dashboard de métricas do WhatsApp Intelligence (sentimento, intenções, tendências).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCardWithSparkline } from "@/components/whatsapp/metric-card-with-sparkline";
import { SentimentTrendChart } from "@/components/whatsapp/sentiment-trend-chart";
import { IntentDistributionChart } from "@/components/whatsapp/intent-distribution-chart";
import { SyncConversationsButton } from "@/components/whatsapp/sync-conversations-button";
import { BulkAnalyzeButton } from "@/components/whatsapp/bulk-analyze-button";

export default async function WhatsAppDashboardPage() {
  noStore();

  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const oneDayAgo = new Date(now.getTime() - 86400000);

  const [
    { data: recentInsights },
    { data: previousInsights },
    { data: thirtyDaysInsights },
    { count: syncedConversationsCount },
    { data: criticalConversations },
  ] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("sentiment, intent, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", sevenDaysAgo.toISOString()),
    supabase
      .from("conversation_insights")
      .select("sentiment, intent, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", fourteenDaysAgo.toISOString())
      .lt("generated_at", sevenDaysAgo.toISOString()),
    supabase
      .from("conversation_insights")
      .select("sentiment, intent, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("conversation_insights")
      .select("conversation_id")
      .eq("company_id", companyId)
      .eq("sentiment", "negativo")
      .gte("generated_at", oneDayAgo.toISOString()),
  ]);

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
    const hasSyncedConversations = (syncedConversationsCount ?? 0) > 0;

    if (hasSyncedConversations) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-success/30 bg-success-light p-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <p className="ax-t2">
            {syncedConversationsCount} conversa{syncedConversationsCount === 1 ? "" : "s"} pronta{syncedConversationsCount === 1 ? "" : "s"} para análise
          </p>
          <p className="mt-2 ax-body text-[var(--color-text-secondary)]">
            Rode a IA para extrair sentimento, intenção e oportunidades.
          </p>
          <div className="mt-6 flex gap-2">
            <BulkAnalyzeButton companyId={companyId} />
            <SyncConversationsButton companyId={companyId} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
          <MessageSquare className="h-6 w-6 text-[var(--color-text-tertiary)]" />
        </div>
        <p className="ax-t2">Comece sincronizando conversas</p>
        <p className="mt-2 ax-body text-[var(--color-text-secondary)]">
          Conecte o Evo CRM para trazer conversas e desbloquear métricas de sentimento.
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
      {/* Command Bar — ações rápidas com hierarquia clara */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)]">
              <AlertCircle className="h-3.5 w-3.5" />
              {criticalCount} conversa{criticalCount === 1 ? "" : "s"} crítica{criticalCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <BulkAnalyzeButton companyId={companyId} />
          <SyncConversationsButton companyId={companyId} />
        </div>
      </div>

      {/* Métricas com sparklines */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardWithSparkline
          title={`${totalAnalyzed} conversa${totalAnalyzed === 1 ? "" : "s"} analisada${totalAnalyzed === 1 ? "" : "s"}`}
          value={totalAnalyzed}
          subtitle={totalVariation !== null && totalVariation > 0 ? `${totalVariation}% a mais que semana passada` : "Últimos 7 dias"}
          icon="sparkles"
          sparklineData={sparklineData}
          change={totalVariation}
        />

        <MetricCardWithSparkline
          title={sentimentCounts.positivo > 0 ? `${Math.round((sentimentCounts.positivo / totalAnalyzed) * 100)}% positivas` : "Sentimento positivo"}
          value={sentimentCounts.positivo}
          subtitle={sentimentCounts.positivo > sentimentCounts.negativo ? "Clima favorável" : "Atenção ao tom das conversas"}
          color="success"
          sparklineData={sparklineData}
        />

        <MetricCardWithSparkline
          title={topIntent?.[0] ? `Intenção: ${topIntent[0]}` : "Principal intenção"}
          value={topIntent?.[1] ?? 0}
          subtitle={topIntent?.[0] ? `${topIntent[1]} conversa${topIntent[1] === 1 ? "" : "s"} com esse sinal` : "Nenhuma detectada ainda"}
          icon="target"
          color="primary"
        />

        <MetricCardWithSparkline
          title={criticalCount > 0 ? `${criticalCount} precisam de ação` : "Tudo em ordem"}
          value={criticalCount}
          subtitle={criticalCount > 0 ? "Negativas nas últimas 24h — resolva já" : "Nenhuma conversa crítica recente"}
          icon="alert"
          color={criticalCount > 0 ? "danger" : undefined}
          className={criticalCount > 0 ? "border-danger" : ""}
          href={criticalCount > 0 ? "/whatsapp-intelligence/conversas?sentiment=negativo&period=1" : undefined}
        />
      </div>

      {/* Gráficos de análise */}
      <div className="mt-2 grid gap-6 lg:grid-cols-2">
        <SentimentTrendChart data={sentimentTrendData} />
        <IntentDistributionChart data={intentDistributionData} />
      </div>
    </>
  );
}
