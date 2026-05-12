/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/page.tsx
 * Propósito: Painel da Inteligência — porta única com dois modos:
 *
 *              ?modo=agora      -> Operacao ao vivo (default)
 *              ?modo=historico  -> Inteligencia Comercial historica
 *                                  (Pulso, Cold leads, Funil, Objecoes,
 *                                   Heatmap chegada x resposta, Recomendacoes
 *                                   + secoes analiticas §1-§4 quando ha insights)
 *
 *            Decisao da Onda 2 do redesign 7->3 abas (party mode). Header da
 *            pagina mostra toggle segmentado.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Activity, AlertCircle, ChevronRight, MessageSquare, Sparkles, Users2 } from "lucide-react";
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
import {
  ColdLeadsCard,
  ColdLeadsCardSkeleton,
} from "@/components/whatsapp/cold-leads-card";
import {
  PulsoComercial,
  PulsoComercialSkeleton,
} from "@/components/whatsapp/pulso-comercial";
import {
  FunilComercialCard,
  FunilComercialCardSkeleton,
} from "@/components/whatsapp/funil-comercial";
import {
  ObjecoesFrequentesCard,
  ObjecoesFrequentesCardSkeleton,
} from "@/components/whatsapp/objecoes-frequentes";
import {
  HeatmapRespostaCard,
  HeatmapRespostaCardSkeleton,
} from "@/components/whatsapp/heatmap-resposta";
import {
  RecomendacoesAcoesCard,
  RecomendacoesAcoesCardSkeleton,
} from "@/components/whatsapp/recomendacoes-acoes";
import { AnaliseHeatmap } from "@/components/whatsapp/analise-heatmap";
import { AnalisePeriodPicker } from "@/components/whatsapp/analise-period-picker";
import { parsePeriodFromParam } from "@/lib/whatsapp/analise-period";
import { NicheBenchmarkCard } from "@/components/dashboard/niche-benchmark-card";
import { PainelAoVivo } from "@/components/whatsapp/painel-ao-vivo";
import { PainelModeToggle } from "@/components/whatsapp/painel-mode-toggle";
import { parsePainelModo } from "@/lib/whatsapp/painel-modo";

const DAY_MS = 86_400_000;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WhatsAppDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();

  const params = await searchParams;
  const modo = parsePainelModo(params.modo);
  const period = parsePeriodFromParam(params.period);

  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  // Modo "Ao vivo" — engole o que era a aba Operacao
  if (modo === "agora") {
    return (
      <div className="space-y-3.5">
        <PainelHeader active="agora" />
        <PainelAoVivo companyId={companyId} />
      </div>
    );
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

  const totalAnalyzed = (recentInsights ?? []).length;
  const showAnalysisEmptyBanner = totalAnalyzed === 0;

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
    <div className="space-y-3.5">
      <PainelHeader active="historico" />

      {/* Camada 1 — Pulso Comercial (acima da dobra) */}
      <Suspense fallback={<PulsoComercialSkeleton />}>
        <PulsoComercial companyId={companyId} />
      </Suspense>

      {/* Toolbar: period + ações primárias */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AnalisePeriodPicker />
        <div className="flex flex-wrap gap-2">
          <BulkAnalyzeButton companyId={companyId} />
          <SyncConversationsButton companyId={companyId} />
        </div>
      </div>

      {/* Mudanças notáveis · grid full width */}
      <Suspense fallback={<NotableChangesSkeleton />}>
        <AnaliseNotableChanges companyId={companyId} />
      </Suspense>

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

      {/* §0 — Leads esfriando agora (Inteligência Comercial v0.1) */}
      <Suspense fallback={<ColdLeadsCardSkeleton />}>
        <ColdLeadsCard companyId={companyId} />
      </Suspense>

      {/* Banner de "rode a IA" — só aparece quando faltam insights p/ §1-§4 */}
      {showAnalysisEmptyBanner ? (
        <AnalysisEmptyBanner
          companyId={companyId}
          hasSynced={Boolean(syncedConversationsCount)}
        />
      ) : null}

      {/* Volume diário + intenções · full-width antes do masonry (gráficos
          precisam de largura) */}
      {!showAnalysisEmptyBanner ? (
        <SectionWrapper
          icon={Activity}
          question="Está vindo mais ou menos cliente que antes?"
          subtitle={`Volume diário de insights · janela ${period} dias · distribuição de intenções (últimos 7 dias).`}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <AnaliseVolumeChart data={volumeData} windowDays={period} />
            <IntentDistributionChart data={intentDistributionData} />
          </div>
        </SectionWrapper>
      ) : null}

      {/* Masonry de cards analíticos · 1col mobile · 2col desktop.
          CSS columns flui os cards verticalmente preenchendo gaps automaticamente —
          cada filho ganha break-inside-avoid pra não cortar entre colunas. */}
      <div className="lg:columns-2 lg:gap-3.5 [&>*]:mb-3.5 [&>*]:break-inside-avoid">
        {!showAnalysisEmptyBanner ? (
          <>
            <Suspense fallback={<SectionSkeleton />}>
              <AnaliseVendorPerformance companyId={companyId} />
            </Suspense>

            <SectionWrapper
              icon={Users2}
              question="Como estamos vs outros do mesmo nicho?"
              subtitle="Network effect: cada novo tenant melhora a média do nicho pra todos."
            >
              <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />}>
                <NicheBenchmarkCard companyId={companyId} />
              </Suspense>
            </SectionWrapper>

            <Suspense fallback={<SectionSkeleton />}>
              <AnaliseHeatmap companyId={companyId} windowDays={period} />
            </Suspense>
          </>
        ) : null}

        <Suspense fallback={<HeatmapRespostaCardSkeleton />}>
          <HeatmapRespostaCard companyId={companyId} />
        </Suspense>

        <Suspense fallback={<FunilComercialCardSkeleton />}>
          <FunilComercialCard companyId={companyId} />
        </Suspense>

        <Suspense fallback={<ObjecoesFrequentesCardSkeleton />}>
          <ObjecoesFrequentesCard companyId={companyId} />
        </Suspense>
      </div>

      {/* Próximas Ações Sugeridas · full-width (lista densa, fora do masonry) */}
      <Suspense fallback={<RecomendacoesAcoesCardSkeleton />}>
        <RecomendacoesAcoesCard companyId={companyId} />
      </Suspense>
    </div>
  );
}

// =============================================================================
// PainelHeader — toggle Ao vivo / Historico no topo do Painel
// =============================================================================

function PainelHeader({ active }: { active: "agora" | "historico" }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <PainelModeToggle active={active} />
      <p className="text-[11.5px] text-[var(--color-text-tertiary)]">
        {active === "agora"
          ? "Veja quem está esperando agora · atualiza a cada 30s"
          : "Métricas históricas e tendências do funil"}
      </p>
    </header>
  );
}

// =============================================================================
// Banner condicional: aparece quando faltam insights p/ as secoes analiticas
// (§1-§4). NAO bloqueia o Pulso, Cold leads, Funil, Objeções, Heatmap-resposta
// e Recomendações — esses tem proprios empty states amigaveis.
// =============================================================================

function AnalysisEmptyBanner({
  companyId,
  hasSynced,
}: {
  companyId: string;
  hasSynced: boolean;
}) {
  if (hasSynced) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success-bg)] px-4 py-2.5">
        <Sparkles className="h-4 w-4 flex-shrink-0 text-[var(--color-success)]" />
        <p className="text-[12.5px] leading-snug text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text)]">Suas conversas estão prontas para análise.</span>{" "}
          Toque em <b>Analisar todas pendentes</b> acima para extrair sentimento e intenção.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      <p className="text-[12.5px] leading-snug text-[var(--color-text-secondary)]">
        <span className="font-semibold text-[var(--color-text)]">Conecte o WhatsApp para começar.</span>{" "}
        Toque em <b>Sincronizar</b> acima para importar suas conversas.
      </p>
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

function SectionSkeleton() {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
        <div className="h-7 w-7 rounded-full bg-[var(--color-surface-2)]" />
        <div className="h-5 w-64 animate-pulse rounded bg-[var(--color-surface-2)]" />
      </div>
      <div className="h-32 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
    </section>
  );
}
