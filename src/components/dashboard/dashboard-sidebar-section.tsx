/**
 * Arquivo: src/components/dashboard/dashboard-sidebar-section.tsx
 * Propósito: Seção lateral do dashboard carregada com Suspense independente.
 *            Mostra alertas críticos (ou "Tudo em dia") com base em conversas
 *            negativas não resolvidas e integrações com erro.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import type { Database, Json } from "@/database/types/database.types";

type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];

const DAY_MS = 86_400_000;

function formatRelativeTime(value: string | null) {
  if (!value) return "agora";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60_000), 0);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays}d`;
}

function extractPlatforms(rawPlatforms: Json) {
  if (!Array.isArray(rawPlatforms)) return [] as string[];
  return rawPlatforms
    .map((p) => (typeof p === "string" ? p : null))
    .filter((p): p is string => Boolean(p));
}

export async function DashboardSidebarSection({
  companyId,
}: {
  companyId: string;
  isOwnerOrAdmin?: boolean;
}) {
  noStore();

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const sevenDaysAgoIso = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const nowIso = now.toISOString();
  const fortyEightHoursAgoIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [
    negativeInsightsResult,
    integrationsResult,
    failedPostsResult,
  ] = await Promise.all([
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

  // Negative conversations resolution
  const negativeInsights = negativeInsightsResult.data ?? [];
  const uniqueConversationIds = Array.from(
    new Set(
      negativeInsights
        .map((item) => item.conversation_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  let unresolvedNegativeCount = 0;
  let latestNegativeConversationText = "";

  if (uniqueConversationIds.length > 0) {
    const { data: conversationsData } = await supabase
      .from("conversations")
      .select("id, status, contact_name")
      .eq("company_id", companyId)
      .in("id", uniqueConversationIds);

    const conversationMap = new Map(
      (conversationsData ?? []).map((item) => [item.id, item]),
    );

    const unresolvedConversationIds = new Set<string>();
    for (const insight of negativeInsights) {
      if (!insight.conversation_id) continue;
      const conversation = conversationMap.get(insight.conversation_id);
      const isResolved = conversation?.status?.toLowerCase().trim() === "resolved";
      if (!isResolved) unresolvedConversationIds.add(insight.conversation_id);
    }

    unresolvedNegativeCount = unresolvedConversationIds.size;

    const latestNegative = negativeInsights.find((insight) =>
      insight.conversation_id ? unresolvedConversationIds.has(insight.conversation_id) : false,
    );
    if (latestNegative?.conversation_id) {
      const latestConversation = conversationMap.get(latestNegative.conversation_id);
      const contactName = latestConversation?.contact_name ?? "Contato sem nome";
      latestNegativeConversationText = `Última: ${contactName} - ${formatRelativeTime(latestNegative.generated_at)}`;
    }
  }

  // Build alerts — integrações continuam sendo monitoradas:
  // verde = silencioso, vermelho = alerta acionável aqui.
  const alerts: DashboardAlert[] = [];
  const failedPosts = failedPostsResult.data ?? [];
  const failedPostsCount = failedPosts.length;
  const failedPlatforms = Array.from(
    new Set(
      failedPosts
        .flatMap((post) => extractPlatforms(post.platforms))
        .map((platform) => platform[0]?.toUpperCase() + platform.slice(1)),
    ),
  );

  if (unresolvedNegativeCount > 0) {
    alerts.push({
      id: "negative-conversations",
      variant: "danger",
      title: `${unresolvedNegativeCount} conversas negativas sem resposta`,
      description:
        latestNegativeConversationText ||
        "Há conversas críticas aguardando retorno.",
      actionHref: "/whatsapp-intelligence",
      actionLabel: "Ver todas",
    });
  }

  if (failedPostsCount > 0) {
    alerts.push({
      id: "failed-posts",
      variant: "danger",
      title: `${failedPostsCount} posts falharam na publicação`,
      description:
        failedPlatforms.length > 0
          ? failedPlatforms.join(" · ")
          : "Verifique os canais e tente publicar novamente.",
      actionHref: "/social-publisher",
      actionLabel: "Ver posts",
    });
  }

  const integrations = (integrationsResult.data ?? []) as Pick<
    IntegrationRow,
    "id" | "company_id" | "type" | "is_active" | "test_status" | "last_tested_at"
  >[];

  const integrationLabelByType: Record<IntegrationRow["type"], string> = {
    evo_crm: "Evo CRM",
    evolution_api: "Evolution API",
    upload_post: "Upload-Post API",
    openrouter: "OpenRouter",
  };

  integrations
    .filter((integration) => integration.test_status === "error")
    .forEach((integration) => {
      alerts.push({
        id: `integration-${integration.type}`,
        variant: "warning",
        title: `${integrationLabelByType[integration.type]} com erro`,
        description: integration.last_tested_at
          ? `Último teste ${formatRelativeTime(integration.last_tested_at)}`
          : "A integração precisa ser revisada.",
        actionHref: "/settings?tab=integrations",
        actionLabel: "Verificar configuração",
      });
    });

  // Quando não há alertas, retorna null — o RiskControlCard no tríptico
  // já mostra "0 alertas / Tudo em dia". Evita duplicação e elimina o
  // espaço vazio na sidebar quando o sistema está saudável.
  if (alerts.length === 0) {
    return null;
  }

  return <AlertsCard alerts={alerts} />;
}
