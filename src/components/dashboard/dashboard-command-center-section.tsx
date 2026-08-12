import "server-only";

import {
  DashboardCommandCenterView,
  type DashboardCommandCenterData,
} from "@/components/dashboard/dashboard-command-center-view";
import {
  getConversationKpiData,
  getDashboardAlertsData,
  getStalledConversations,
} from "@/lib/dashboard/shared-queries";
import {
  getGroupRadarData,
  type GroupRadarInsight,
  type GroupRadarItem,
  type GroupRadarStatus,
} from "@/services/group-intelligence/queries";

const STATUS_LABEL: Record<GroupRadarStatus, string> = {
  inactive: "Inativo",
  quiet: "Radar",
  active: "OK",
  hot: "Quente",
  risk: "Risco",
};

const INSIGHT_KIND_LABEL: Record<GroupRadarInsight["kind"], string> = {
  action_item: "Pendência",
  contact_info: "Contato",
  decision: "Oportunidade",
  fact: "Fato",
  preference: "Preferência",
  response: "Resposta IA",
};

function getGroupAction(group: GroupRadarItem): string {
  if (group.status === "risk") return "Responder pendência e acionar responsável.";
  if (group.status === "hot") return "Enviar oferta, prazo ou próximo horário.";
  if (group.lastMessagePreview) return group.lastMessagePreview;
  if (group.status === "inactive") return "Grupo fora do monitoramento ativo.";
  return "Grupo ativo, sem bloqueio comercial.";
}

function formatInsightTime(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function integrationHealth(
  integrations: DashboardCommandCenterData["health"],
): DashboardCommandCenterData["health"] {
  return integrations;
}

function getIntegrationState(
  alerts: Awaited<ReturnType<typeof getDashboardAlertsData>>,
  type: "evo_crm" | "evolution_api" | "openrouter",
): "OK" | "Ação" {
  const integration = alerts.integrations.find((item) => item.type === type);
  if (!integration) return "Ação";
  if (!integration.is_active || integration.test_status === "error") return "Ação";
  return "OK";
}

export async function DashboardCommandCenterSection({
  companyId,
  companyName,
  greeting,
}: {
  companyId: string;
  companyName: string | null;
  greeting: string;
}) {
  const [stalled, conversationKpis, groupRadar, alerts] = await Promise.all([
    getStalledConversations(companyId),
    getConversationKpiData(companyId),
    getGroupRadarData(companyId),
    getDashboardAlertsData(companyId),
  ]);

  const data: DashboardCommandCenterData = {
    greeting,
    companyName,
    stalled: {
      count: stalled.count,
      topItem: stalled.items[0]
        ? {
            conversationId: stalled.items[0].conversationId,
            customerName: stalled.items[0].customerName,
            waitSeconds: stalled.items[0].waitSeconds,
          }
        : null,
    },
    kpis: {
      attention: stalled.count,
      groupsMonitored: groupRadar.summary.totalGroups,
      activeGroups: groupRadar.summary.activeGroups,
      messages24h: groupRadar.summary.messages24h + conversationKpis.activeToday,
      aiResponses24h: groupRadar.summary.agentResponses24h,
      opportunities: conversationKpis.opportunities7d + groupRadar.summary.hotGroups,
    },
    groups: groupRadar.groups.slice(0, 3).map((group) => ({
      id: group.configId,
      name: group.name,
      action: getGroupAction(group),
      messages24h: group.messageCount24h,
      people24h: group.uniqueSenders24h,
      status: STATUS_LABEL[group.status],
    })),
    signals: groupRadar.insights.slice(0, 3).map((insight) => ({
      id: insight.id,
      groupName: insight.groupName,
      kind: INSIGHT_KIND_LABEL[insight.kind],
      time: formatInsightTime(insight.createdAt),
      text: insight.text,
    })),
    health: integrationHealth({
      evoCrm: getIntegrationState(alerts, "evo_crm"),
      aiBase: groupRadar.groups.some((group) => group.feedToRag) ? "OK" : "Ação",
      openRouter: getIntegrationState(alerts, "openrouter"),
    }),
  };

  return <DashboardCommandCenterView data={data} />;
}
