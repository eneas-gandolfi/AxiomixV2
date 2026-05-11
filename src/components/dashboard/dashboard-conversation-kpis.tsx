/**
 * Arquivo: src/components/dashboard/dashboard-conversation-kpis.tsx
 * Proposito: Trindade KPI do dashboard — Conversas analisadas e Oportunidades.
 *            Roda as 6 queries de contagem + sparklines em paralelo, dentro
 *            do proprio Suspense, sem bloquear hero/insights.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { MetricCard } from "@/components/dashboard/metric-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

function getVariation(currentValue: number, previousValue: number) {
  if (previousValue === 0) return null;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function buildDailyCountsFromDates(dates: string[], daysBack = 7): number[] {
  const counts: number[] = new Array(daysBack).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - d.getTime()) / DAY_MS);
    if (diffDays >= 0 && diffDays < daysBack) {
      counts[daysBack - 1 - diffDays]++;
    }
  }

  return counts;
}

export function DashboardConversationKpisSkeleton() {
  return (
    <>
      <div className="dashboard-panel rounded-[20px] p-5">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-40 rounded" />
        <div className="skeleton-shimmer animate-shimmer mb-3 h-10 w-24 rounded" />
        <div className="skeleton-shimmer animate-shimmer h-12 w-full rounded" />
      </div>
      <div className="dashboard-panel rounded-[20px] p-5">
        <div className="skeleton-shimmer animate-shimmer mb-3 h-4 w-40 rounded" />
        <div className="skeleton-shimmer animate-shimmer mb-3 h-10 w-24 rounded" />
        <div className="skeleton-shimmer animate-shimmer h-12 w-full rounded" />
      </div>
    </>
  );
}

export async function DashboardConversationKpis({
  companyId,
}: {
  companyId: string;
}) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const fourteenDaysAgoIso = new Date(now.getTime() - 14 * DAY_MS).toISOString();

  const [
    conversationsCurrentResult,
    conversationsPreviousResult,
    opportunitiesCurrentResult,
    opportunitiesPreviousResult,
    conversationDatesResult,
    opportunityDatesResult,
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("last_message_at", sevenDaysAgoIso)
      .lte("last_message_at", nowIso),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("last_message_at", fourteenDaysAgoIso)
      .lt("last_message_at", sevenDaysAgoIso),
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", sevenDaysAgoIso)
      .lte("generated_at", nowIso),
    supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", fourteenDaysAgoIso)
      .lt("generated_at", sevenDaysAgoIso),
    supabase
      .from("conversations")
      .select("last_message_at")
      .eq("company_id", companyId)
      .gte("last_message_at", sevenDaysAgoIso)
      .lte("last_message_at", nowIso),
    supabase
      .from("conversation_insights")
      .select("generated_at")
      .eq("company_id", companyId)
      .eq("intent", "compra")
      .gte("generated_at", sevenDaysAgoIso)
      .lte("generated_at", nowIso),
  ]);

  const queryErrors = [
    conversationsCurrentResult.error,
    conversationsPreviousResult.error,
    opportunitiesCurrentResult.error,
    opportunitiesPreviousResult.error,
    conversationDatesResult.error,
    opportunityDatesResult.error,
  ];

  if (queryErrors.some((queryError) => queryError)) {
    throw new Error("Erro ao carregar dados. Tente novamente.");
  }

  const conversationsCurrent = conversationsCurrentResult.count ?? 0;
  const conversationsPrevious = conversationsPreviousResult.count ?? 0;
  const opportunitiesCurrent = opportunitiesCurrentResult.count ?? 0;
  const opportunitiesPrevious = opportunitiesPreviousResult.count ?? 0;

  const conversationSparkData = buildDailyCountsFromDates(
    (conversationDatesResult.data ?? [])
      .map((d) => d.last_message_at)
      .filter(Boolean) as string[],
  );
  const opportunitySparkData = buildDailyCountsFromDates(
    (opportunityDatesResult.data ?? [])
      .map((d) => d.generated_at)
      .filter(Boolean) as string[],
  );

  return (
    <>
      <MetricCard
        label="Conversas analisadas · últimos 7 dias"
        value={conversationsCurrent}
        icon="message-square"
        sublabel="últimos 7 dias"
        change={getVariation(conversationsCurrent, conversationsPrevious)}
        emptyMessage="Primeiros dados desta semana"
        ctaLabel="Ver conversas"
        ctaHref="/whatsapp-intelligence"
        narrative="Volume de interação do seu time esta semana."
        emptyHint={
          conversationsCurrent === 0
            ? "Conecte o Evo CRM em Configurações para começar a sincronizar conversas."
            : undefined
        }
        variant="hero"
        sparkData={conversationSparkData}
        animationDelay="delay-100"
      />
      <MetricCard
        label="Oportunidades de venda ativas"
        value={opportunitiesCurrent}
        icon="shopping-cart"
        sublabel="intenção de compra detectada"
        change={getVariation(opportunitiesCurrent, opportunitiesPrevious)}
        emptyMessage="Nenhuma intenção de compra detectada ainda"
        ctaLabel="Ver oportunidades"
        ctaHref="/whatsapp-intelligence?filter=compra"
        narrative={
          opportunitiesCurrent > 0
            ? "Clientes com sinal de compra detectado pela IA."
            : "A IA está aprendendo o padrão de compra do seu nicho. Volte amanhã."
        }
        variant="hero"
        sparkData={opportunitySparkData}
        animationDelay="delay-200"
      />
    </>
  );
}
