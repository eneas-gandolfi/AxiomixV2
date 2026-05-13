/**
 * Arquivo: src/components/dashboard/dashboard-conversation-kpis.tsx
 * Proposito: Strip de 4 KPIs compactos do dashboard.
 *            - Sem resposta +24h (urgente, clicável)
 *            - Conversas ativas hoje (+ delta vs ontem)
 *            - Oportunidades de venda ativas (7d)
 *            - Tempo médio de resposta (→ Fase 2.5, em breve)
 *
 *            Os 2 MetricCards hero (conversas 7d + oportunidades 7d com
 *            sparkline) viraram o named export `KpiHeroCards` no mesmo arquivo.
 *
 *            Ambos consomem `getConversationKpiData` (React.cache) pra
 *            compartilhar fetches entre os Suspenses no page.
 * Autor: AXIOMIX
 * Data: 2026-05-13 (Fase 3 — cache consolidado em shared-queries)
 */

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { MetricCard } from "@/components/dashboard/metric-card";
import { getConversationKpiData } from "@/lib/dashboard/shared-queries";

const DAY_MS = 86_400_000;

/** Retorna delta percentual arredondado ou null se não houver histórico. */
function getVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Formata delta como "+12% vs ontem" / "-3% vs ontem" / "igual a ontem". */
function formatDelta(delta: number | null): string {
  if (delta === null) return "sem histórico";
  if (delta > 0) return `+${delta}% vs ontem`;
  if (delta < 0) return `${delta}% vs ontem`;
  return "igual a ontem";
}

/** Formata segundos como "Xm Ys" / "Xh Ym" / "Xs" pro KPI de tempo médio. */
function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Constrói histograma de 7 dias a partir de uma lista de timestamps. */
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
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 shadow-card-modern"
        >
          <div className="skeleton-shimmer animate-shimmer mb-2 h-2.5 w-24 rounded" />
          <div className="skeleton-shimmer animate-shimmer mb-2 h-7 w-14 rounded" />
          <div className="skeleton-shimmer animate-shimmer h-2.5 w-20 rounded" />
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton dedicado ao bloco `KpiHeroCards`: 2 MetricCards hero
 * (conversas 7d + oportunidades 7d) com sparkline. Espelha a forma real
 * pra evitar layout shift quando o Suspense resolve.
 */
export function KpiHeroCardsSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton-shimmer animate-shimmer h-3 w-32 rounded" />
              <div className="skeleton-shimmer animate-shimmer h-9 w-20 rounded" />
              <div className="skeleton-shimmer animate-shimmer h-3 w-28 rounded" />
            </div>
            <div className="skeleton-shimmer animate-shimmer h-9 w-9 shrink-0 rounded-lg" />
          </div>
          <div className="skeleton-shimmer animate-shimmer mt-4 h-12 w-full rounded" />
          <div className="skeleton-shimmer animate-shimmer mt-3 h-3 w-3/5 rounded" />
        </div>
      ))}
    </>
  );
}

export async function DashboardConversationKpis({
  companyId,
}: {
  companyId: string;
}) {
  noStore();

  const data = await getConversationKpiData(companyId);
  const todayDelta = getVariation(data.activeToday, data.activeYesterday);

  return (
    <>
      {/* KPI 1 — sem resposta +24h: urgente quando > 0, clicável */}
      <KpiTile
        label="Sem resposta +24h"
        value={data.stalledCount}
        sublabel={
          data.stalledCount > 0 ? "atenção necessária" : "tudo respondido"
        }
        state="live"
        urgent={data.stalledCount > 0}
        href={data.stalledCount > 0 ? "/whatsapp-intelligence/operacao" : undefined}
      />

      {/* KPI 2 — conversas ativas hoje + delta vs ontem */}
      <KpiTile
        label="Ativas hoje"
        value={data.activeToday}
        sublabel={formatDelta(todayDelta)}
        state="live"
      />

      {/* KPI 3 — oportunidades de venda (7d) */}
      <KpiTile
        label="Oportunidades"
        value={data.opportunities7d}
        sublabel={
          data.opportunities7d > 0
            ? "intenção de compra · 7d"
            : "aguardando padrões"
        }
        state="live"
      />

      {/* KPI 4 — tempo médio de resposta inbound→outbound (janela 7d) */}
      <KpiTile
        label="Tempo médio resp."
        value={
          data.avgResponseSeconds != null
            ? formatResponseTime(data.avgResponseSeconds)
            : "—"
        }
        sublabel={
          data.avgResponseSampleSize > 0
            ? `${data.avgResponseSampleSize} ${data.avgResponseSampleSize === 1 ? "resposta" : "respostas"} · 7d`
            : "sem dados ainda"
        }
        state="live"
      />
    </>
  );
}

/**
 * MetricCards hero (conversas 7d + oportunidades) que antes viviam dentro de
 * DashboardConversationKpis. Compartilham `getConversationKpiData` com o strip
 * via React.cache — zero queries duplicadas no mesmo request.
 */
export async function KpiHeroCards({ companyId }: { companyId: string }) {
  noStore();

  const data = await getConversationKpiData(companyId);
  const convSpark = buildDailyCountsFromDates(data.conversationDates);
  const oppSpark = buildDailyCountsFromDates(data.opportunityDates);

  return (
    <>
      <MetricCard
        label="Conversas analisadas · 7 dias"
        value={data.conversations7d}
        icon="message-square"
        sublabel="últimos 7 dias"
        change={getVariation(data.conversations7d, data.conversations7dPrevious)}
        emptyMessage="Primeiros dados desta semana"
        ctaLabel="Ver conversas"
        ctaHref="/whatsapp-intelligence"
        narrative="Volume de interação do seu time esta semana."
        emptyHint={
          data.conversations7d === 0
            ? "Conecte o Evo CRM em Configurações para começar a sincronizar conversas."
            : undefined
        }
        variant="hero"
        sparkData={convSpark}
        animationDelay="delay-100"
      />
      <MetricCard
        label="Oportunidades de venda ativas"
        value={data.opportunities7d}
        icon="shopping-cart"
        sublabel="intenção de compra detectada"
        change={getVariation(data.opportunities7d, data.opportunities7dPrevious)}
        emptyMessage="Nenhuma intenção de compra detectada ainda"
        ctaLabel="Ver oportunidades"
        ctaHref="/whatsapp-intelligence?filter=compra"
        narrative={
          data.opportunities7d > 0
            ? "Clientes com sinal de compra detectado pela IA."
            : "A IA está aprendendo o padrão de compra do seu nicho. Volte amanhã."
        }
        variant="hero"
        sparkData={oppSpark}
        animationDelay="delay-200"
      />
    </>
  );
}
