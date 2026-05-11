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
