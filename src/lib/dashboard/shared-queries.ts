/**
 * Arquivo: src/lib/dashboard/shared-queries.ts
 * Proposito: Queries do dashboard compartilhadas entre DashboardSidebarSection
 *            (alertas detalhados) e RiskControlCard (KPI compacto). Antes,
 *            cada componente rodava o mesmo conjunto de queries em paralelo,
 *            duplicando trabalho dentro do mesmo request. Agora ambos chamam
 *            `getDashboardAlertsData(companyId)`, memoizada via React.cache.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/database/types/database.types";
import {
  selectStalledConversations,
  type StalledConversations,
} from "@/lib/dashboard/selectors/stalledConversations";

type IntegrationStatus = Pick<
  Database["public"]["Tables"]["integrations"]["Row"],
  "id" | "company_id" | "type" | "is_active" | "test_status" | "last_tested_at"
>;

type FailedPost = {
  id: string;
  platforms: Json;
  created_at: string | null;
};

export type DashboardAlertsData = {
  /** Conversas negativas (sem filtro de resolvido) recentes — 48h. */
  negativeInsights: Array<{
    conversation_id: string | null;
    generated_at: string | null;
  }>;
  /** IDs de conversas negativas que ainda nao foram marcadas como resolvidas. */
  unresolvedConversationIds: Set<string>;
  unresolvedNegativeCount: number;
  /** Ultimo insight negativo nao resolvido, com nome do contato (se houver). */
  latestNegative: {
    conversationId: string;
    contactName: string;
    generatedAt: string | null;
  } | null;
  integrations: IntegrationStatus[];
  integrationsWithErrorCount: number;
  failedPosts: FailedPost[];
  failedPostsCount: number;
  /** Plataformas distintas das falhas (formatadas, ex: "Instagram", "Facebook"). */
  failedPlatforms: string[];
};

const DAY_MS = 86_400_000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function extractPlatforms(raw: Json): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

function titleCase(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Resolve em um unico request todos os dados de alertas/risco usados pelo
 * dashboard. Memoizado via React.cache: chamadas subsequentes com o mesmo
 * companyId no mesmo render reutilizam o resultado.
 */
export const getDashboardAlertsData = cache(
  async (companyId: string): Promise<DashboardAlertsData> => {
    const supabase = await createSupabaseServerClient();
    const now = Date.now();
    const fortyEightHoursAgoIso = new Date(now - FORTY_EIGHT_HOURS_MS).toISOString();
    const sevenDaysAgoIso = new Date(now - 7 * DAY_MS).toISOString();
    const nowIso = new Date(now).toISOString();

    const [negativeInsightsResult, integrationsResult, failedPostsResult] = await Promise.all([
      supabase
        .from("conversation_insights")
        .select("conversation_id, generated_at")
        .eq("company_id", companyId)
        .eq("sentiment", "negativo")
        .gte("generated_at", fortyEightHoursAgoIso)
        .order("generated_at", { ascending: false }),
      supabase
        .from("integrations")
        .select("id, company_id, type, is_active, test_status, last_tested_at")
        .eq("company_id", companyId),
      supabase
        .from("scheduled_posts")
        .select("id, platforms, created_at")
        .eq("company_id", companyId)
        .eq("status", "failed")
        .gte("created_at", sevenDaysAgoIso)
        .lte("created_at", nowIso),
    ]);

    const negativeInsights = negativeInsightsResult.data ?? [];
    const integrations = (integrationsResult.data ?? []) as IntegrationStatus[];
    const failedPosts = (failedPostsResult.data ?? []) as FailedPost[];

    const uniqueNegativeIds = Array.from(
      new Set(
        negativeInsights
          .map((row) => row.conversation_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    );

    let unresolvedConversationIds = new Set<string>();
    let latestNegative: DashboardAlertsData["latestNegative"] = null;

    if (uniqueNegativeIds.length > 0) {
      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("id, status, contact_name")
        .eq("company_id", companyId)
        .in("id", uniqueNegativeIds);

      const conversationMap = new Map(
        (conversationsData ?? []).map((row) => [row.id, row]),
      );

      const unresolved = new Set<string>();
      for (const insight of negativeInsights) {
        if (!insight.conversation_id) continue;
        const conversation = conversationMap.get(insight.conversation_id);
        const isResolved = conversation?.status?.toLowerCase().trim() === "resolved";
        if (!isResolved) unresolved.add(insight.conversation_id);
      }
      unresolvedConversationIds = unresolved;

      const latest = negativeInsights.find((insight) =>
        insight.conversation_id ? unresolved.has(insight.conversation_id) : false,
      );
      if (latest?.conversation_id) {
        const conv = conversationMap.get(latest.conversation_id);
        latestNegative = {
          conversationId: latest.conversation_id,
          contactName: conv?.contact_name ?? "Contato sem nome",
          generatedAt: latest.generated_at ?? null,
        };
      }
    }

    const failedPlatforms = Array.from(
      new Set(
        failedPosts.flatMap((post) => extractPlatforms(post.platforms).map(titleCase)),
      ),
    );

    return {
      negativeInsights,
      unresolvedConversationIds,
      unresolvedNegativeCount: unresolvedConversationIds.size,
      latestNegative,
      integrations,
      integrationsWithErrorCount: integrations.filter((i) => i.test_status === "error").length,
      failedPosts,
      failedPostsCount: failedPosts.length,
      failedPlatforms,
    };
  },
);

/**
 * Conversas paradas para o dashboard, memoizado por companyId no request.
 * Permite hero, insights e "Proxima acao" compartilharem o mesmo fetch sem
 * duplicar round-trips.
 */
export const getStalledConversations = cache(
  async (companyId: string): Promise<StalledConversations> => {
    const supabase = await createSupabaseServerClient();
    return selectStalledConversations(supabase, companyId);
  },
);

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Início do dia em BRT (UTC-3) como ISO string. `offsetDays` desloca dias. */
function startOfDayBrt(offsetDays = 0): string {
  const now = new Date();
  const brt = new Date(now.getTime() - BRT_OFFSET_MS);
  brt.setUTCHours(0, 0, 0, 0);
  brt.setUTCDate(brt.getUTCDate() + offsetDays);
  return new Date(brt.getTime() + BRT_OFFSET_MS).toISOString();
}

export type ConversationKpiData = {
  /** Conversas sem resposta há mais de 24h (status != 'resolved'). */
  stalledCount: number;
  /** Tempo médio de resposta (segundos) inbound→outbound nos últimos 7 dias.
   *  null quando não há pares suficientes. */
  avgResponseSeconds: number | null;
  /** Quantidade de pares inbound→outbound considerados no cálculo. */
  avgResponseSampleSize: number;
  /** Conversas com atividade hoje (BRT). */
  activeToday: number;
  /** Conversas com atividade ontem (BRT). Pra cálculo de delta. */
  activeYesterday: number;
  /** Conversas com last_message_at nos últimos 7 dias. */
  conversations7d: number;
  /** Conversas com last_message_at entre 7-14 dias atrás. */
  conversations7dPrevious: number;
  /** Insights com intent='compra' nos últimos 7 dias. */
  opportunities7d: number;
  /** Insights com intent='compra' entre 7-14 dias atrás. */
  opportunities7dPrevious: number;
  /** Timestamps de last_message_at nos últimos 7 dias (sparkline). */
  conversationDates: string[];
  /** Timestamps de generated_at de insights de compra nos últimos 7 dias (sparkline). */
  opportunityDates: string[];
};

/**
 * Bundle único de KPIs de conversação do dashboard, memoizado por companyId
 * no request. Consolida as queries antes duplicadas entre `DashboardConversationKpis`
 * (strip de 4 tiles) e `KpiHeroCards` (2 hero cards com sparkline).
 *
 * Reduz de 10 queries duplicadas pra 8 únicas por render do dashboard.
 */
export const getConversationKpiData = cache(
  async (companyId: string): Promise<ConversationKpiData> => {
    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const twentyFourHoursAgoIso = new Date(now.getTime() - DAY_MS).toISOString();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    const fourteenDaysAgoIso = new Date(now.getTime() - 14 * DAY_MS).toISOString();
    const todayStartIso = startOfDayBrt(0);
    const yesterdayStartIso = startOfDayBrt(-1);

    const [
      stalledResult,
      activeTodayResult,
      activeYesterdayResult,
      conversations7dResult,
      conversations7dPrevResult,
      opportunities7dResult,
      opportunities7dPrevResult,
      conversationDatesResult,
      opportunityDatesResult,
      avgResponseResult,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .not("last_message_at", "is", null)
        .lt("last_message_at", twentyFourHoursAgoIso)
        .neq("status", "resolved"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", todayStartIso)
        .lte("last_message_at", nowIso),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("last_message_at", yesterdayStartIso)
        .lt("last_message_at", todayStartIso),
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
      // RPC: tempo médio de resposta (janela 7d). Index reusado:
      // idx_messages_conversation_sent. Falha silenciosa → null.
      // Type assertion: a RPC foi adicionada na migration 20260515120000
      // mas `database.types.ts` ainda não foi regenerado (`supabase gen types`).
      (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{
          data: Array<{ avg_seconds: number | null; sample_size: number }> | null;
          error: { message: string } | null;
        }>
      )("dashboard_avg_response_time", {
        p_company_id: companyId,
        p_window_days: 7,
      }),
    ]);

    const errors = [
      stalledResult.error,
      activeTodayResult.error,
      activeYesterdayResult.error,
      conversations7dResult.error,
      conversations7dPrevResult.error,
      opportunities7dResult.error,
      opportunities7dPrevResult.error,
      conversationDatesResult.error,
      opportunityDatesResult.error,
      // avgResponseResult.error é tratado abaixo (degradação graciosa).
    ];
    if (errors.some(Boolean)) {
      throw new Error("Erro ao carregar KPIs de conversação.");
    }

    // RPC retorna table(avg_seconds numeric, sample_size bigint). Em erro
    // ou ausência de pares, cai pra null/0 sem quebrar o resto do dashboard.
    const avgRow = avgResponseResult.error
      ? null
      : avgResponseResult.data?.[0] ?? null;

    return {
      stalledCount: stalledResult.count ?? 0,
      avgResponseSeconds:
        avgRow?.avg_seconds != null ? Number(avgRow.avg_seconds) : null,
      avgResponseSampleSize:
        avgRow?.sample_size != null ? Number(avgRow.sample_size) : 0,
      activeToday: activeTodayResult.count ?? 0,
      activeYesterday: activeYesterdayResult.count ?? 0,
      conversations7d: conversations7dResult.count ?? 0,
      conversations7dPrevious: conversations7dPrevResult.count ?? 0,
      opportunities7d: opportunities7dResult.count ?? 0,
      opportunities7dPrevious: opportunities7dPrevResult.count ?? 0,
      conversationDates: (conversationDatesResult.data ?? [])
        .map((d) => d.last_message_at)
        .filter(Boolean) as string[],
      opportunityDates: (opportunityDatesResult.data ?? [])
        .map((d) => d.generated_at)
        .filter(Boolean) as string[],
    };
  },
);
