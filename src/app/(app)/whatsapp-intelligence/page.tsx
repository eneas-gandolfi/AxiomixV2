/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/page.tsx
 * Propósito: Aba "Análise" do módulo Inteligência. Reorganizada por
 *            PERGUNTAS (não métricas), seguindo o mockup v2:
 *
 *              [Mudanças notáveis · 3 fatos]   [Sincronizar / Analisar]
 *
 *              [Banner crítico se houver]
 *
 *              ① Quem da minha equipe está em queda? (per-vendor table)
 *              ② Como estamos vs nicho? (benchmark)
 *              ③ Está vindo mais ou menos cliente? (volume + intent bars)
 *
 *            §4 Heatmap dia × hora será adicionado em iteração futura.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AlertCircle, ChevronRight, MessageSquare } from "lucide-react";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IntentDistributionChart } from "@/components/whatsapp/intent-distribution-chart";
import { AnaliseVolumeChart } from "@/components/whatsapp/analise-volume-chart";
import { SyncConversationsButton } from "@/components/whatsapp/sync-conversations-button";
import { BulkAnalyzeButton } from "@/components/whatsapp/bulk-analyze-button";
import { AnaliseNotableChanges } from "@/components/whatsapp/analise-notable-changes";
import {
  AnaliseVendorPerformance,
  SectionWrapper,
} from "@/components/whatsapp/analise-vendor-performance";
import { AnaliseHeatmap } from "@/components/whatsapp/analise-heatmap";
import { AnalisePeriodPicker } from "@/components/whatsapp/analise-period-picker";
import { parsePeriodFromParam } from "@/lib/whatsapp/analise-period";
import { NicheBenchmarkCard } from "@/components/dashboard/niche-benchmark-card";

const DAY_MS = 86_400_000;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WhatsAppDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();

  const params = await searchParams;
  const period = parsePeriodFromParam(params.period);

  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const periodAgo = new Date(now.getTime() - period * DAY_MS);
  const oneDayAgo = new Date(now.getTime() - DAY_MS);

  const [
    { data: recentInsights },
    { data: periodInsights },
    { count: syncedConversationsCount },
    { data: criticalConversations },
  ] = await Promise.all([
    supabase
      .from("conversation_insights")
      .select("intent, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", sevenDaysAgo.toISOString()),
    supabase
      .from("conversation_insights")
      .select("sentiment, generated_at")
      .eq("company_id", companyId)
      .gte("generated_at", periodAgo.toISOString()),
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

  // Empty state — sem insights ainda
  const totalAnalyzed = (recentInsights ?? []).length;
  if (totalAnalyzed === 0) {
    return <EmptyState companyId={companyId} hasSynced={Boolean(syncedConversationsCount)} />;
  }

  // Distribuição de intenções (§3)
  const intentCounts: Record<string, number> = {};
  for (const insight of recentInsights ?? []) {
    if (insight.intent) {
      intentCounts[insight.intent] = (intentCounts[insight.intent] ?? 0) + 1;
    }
  }
  const intentDistributionData = Object.entries(intentCounts)
    .map(([name, value]) => ({ name, value, color: "" }))
    .sort((a, b) => b.value - a.value);

  // Volume diário (§3) — count de insights por dia na janela escolhida.
  const volumeByDate = new Map<string, number>();
  for (const insight of periodInsights ?? []) {
    if (!insight.generated_at) continue;
    const date = new Date(insight.generated_at).toISOString().split("T")[0];
    volumeByDate.set(date, (volumeByDate.get(date) ?? 0) + 1);
  }
  const lastPeriodDays: string[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY_MS);
    lastPeriodDays.push(date.toISOString().split("T")[0]);
  }
  const volumeData = lastPeriodDays.map((date) => ({
    date,
    count: volumeByDate.get(date) ?? 0,
  }));

  const criticalCount = (criticalConversations ?? []).length;

  return (
    <div className="space-y-6">
      {/* Top strip: 3 fatos + period picker + ações primárias */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_auto]">
        <Suspense fallback={<NotableChangesSkeleton />}>
          <AnaliseNotableChanges companyId={companyId} />
        </Suspense>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <AnalisePeriodPicker />
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <BulkAnalyzeButton companyId={companyId} />
            <SyncConversationsButton companyId={companyId} />
          </div>
        </div>
      </div>

      {/* Banner crítico */}
      {criticalCount > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-4 py-3">
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
            <AlertCircle className="h-4 w-4" />
          </span>
          <p className="flex-1 text-sm text-[var(--color-text)]">
            <strong className="font-semibold text-[var(--color-danger)]">
              {criticalCount} conversa{criticalCount === 1 ? "" : "s"} crítica
              {criticalCount === 1 ? "" : "s"}
            </strong>{" "}
            nas últimas 24h — sentimento negativo detectado, ainda em aberto.
          </p>
          <Link
            href="/whatsapp-intelligence/conversas?sentiment=negativo&period=1"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-danger)] hover:underline"
          >
            Ver no fluxo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {/* §1 — Quem da minha equipe está em queda? */}
      <Suspense fallback={<SectionSkeleton number={1} />}>
        <AnaliseVendorPerformance companyId={companyId} />
      </Suspense>

      {/* §2 — Você vs nicho */}
      <SectionWrapper
        number={2}
        question="Como estamos vs outros do mesmo nicho?"
        subtitle="Network effect: cada novo tenant melhora a média do nicho pra todos."
      >
        <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />}>
          <NicheBenchmarkCard companyId={companyId} />
        </Suspense>
      </SectionWrapper>

      {/* §3 — Está vindo mais ou menos cliente? */}
      <SectionWrapper
        number={3}
        question="Está vindo mais ou menos cliente que antes?"
        subtitle={`Volume diário de insights · janela ${period} dias · distribuição de intenções (últimos 7 dias).`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <AnaliseVolumeChart data={volumeData} windowDays={period} />
          <IntentDistributionChart data={intentDistributionData} />
        </div>
      </SectionWrapper>

      {/* §4 — Algum padrão preocupante? */}
      <Suspense fallback={<SectionSkeleton number={4} />}>
        <AnaliseHeatmap companyId={companyId} windowDays={period} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// Empty states
// =============================================================================

function EmptyState({
  companyId,
  hasSynced,
}: {
  companyId: string;
  hasSynced: boolean;
}) {
  if (hasSynced) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] p-12 text-center">
        <p className="ax-t2">Conversas prontas para análise</p>
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
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

// =============================================================================
// Skeletons
// =============================================================================

function NotableChangesSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      ))}
    </div>
  );
}

function SectionSkeleton({ number }: { number: number }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] font-bricolage text-sm font-bold text-[var(--color-text-tertiary)]">
          {number}
        </div>
        <div className="h-5 w-64 animate-pulse rounded bg-[var(--color-surface-2)]" />
      </div>
      <div className="h-32 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
    </section>
  );
}
