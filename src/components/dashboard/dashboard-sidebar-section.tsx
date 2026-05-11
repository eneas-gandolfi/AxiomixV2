/**
 * Arquivo: src/components/dashboard/dashboard-sidebar-section.tsx
 * Propósito: Seção lateral do dashboard carregada com Suspense independente.
 *            Mostra alertas críticos (ou nada) com base em conversas negativas
 *            não resolvidas e integrações com erro.
 *
 *            Fonte unica de verdade: `getDashboardAlertsData` (React.cache),
 *            compartilhada com RiskControlCard pra evitar duplicar queries.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";
import { getDashboardAlertsData } from "@/lib/dashboard/shared-queries";
import type { Database } from "@/database/types/database.types";

type IntegrationType = Database["public"]["Tables"]["integrations"]["Row"]["type"];

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

const INTEGRATION_LABEL_BY_TYPE: Record<IntegrationType, string> = {
  evo_crm: "Evo CRM",
  evolution_api: "Evolution API",
  upload_post: "Upload-Post API",
  openrouter: "OpenRouter",
};

export async function DashboardSidebarSection({
  companyId,
}: {
  companyId: string;
  isOwnerOrAdmin?: boolean;
}) {
  const data = await getDashboardAlertsData(companyId);

  const alerts: DashboardAlert[] = [];

  if (data.unresolvedNegativeCount > 0) {
    const description = data.latestNegative
      ? `Última: ${data.latestNegative.contactName} - ${formatRelativeTime(data.latestNegative.generatedAt)}`
      : "Há conversas críticas aguardando retorno.";

    alerts.push({
      id: "negative-conversations",
      variant: "danger",
      title: `${data.unresolvedNegativeCount} conversas negativas sem resposta`,
      description,
      actionHref: "/whatsapp-intelligence",
      actionLabel: "Ver todas",
    });
  }

  if (data.failedPostsCount > 0) {
    alerts.push({
      id: "failed-posts",
      variant: "danger",
      title: `${data.failedPostsCount} posts falharam na publicação`,
      description:
        data.failedPlatforms.length > 0
          ? data.failedPlatforms.join(" · ")
          : "Verifique os canais e tente publicar novamente.",
      actionHref: "/social-publisher",
      actionLabel: "Ver posts",
    });
  }

  data.integrations
    .filter((integration) => integration.test_status === "error")
    .forEach((integration) => {
      alerts.push({
        id: `integration-${integration.type}`,
        variant: "warning",
        title: `${INTEGRATION_LABEL_BY_TYPE[integration.type]} com erro`,
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
