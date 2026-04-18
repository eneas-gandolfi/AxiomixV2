/**
 * Arquivo: src/components/settings/notifications-settings.tsx
 * Propósito: Unificar Alertas (tempo real) e Relatórios (periódico) na aba Notificações.
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

"use client";

import { useState } from "react";
import { Bell, Calendar, Info } from "lucide-react";
import { AlertsSettings } from "@/components/settings/alerts-settings";
import {
  IntegrationsStatusCard,
  type IntegrationStatusItem,
} from "@/components/dashboard/integrations-status-card";
import { NextReportCard } from "@/components/dashboard/next-report-card";
import {
  RecentReportsCard,
  type RecentReportItem,
} from "@/components/dashboard/recent-reports-card";

type SubTabKey = "realtime" | "periodic";

type ReportData = {
  integrations: IntegrationStatusItem[];
  nextSendAtLabel: string;
  managerPhone: string;
  evolutionStatus: { state: "active" | "error" | "missing"; label: string };
  canManageReports: boolean;
  canSendNow: boolean;
  sendDisabledReason?: string;
  recentReports: RecentReportItem[];
  hasRunningJob: boolean;
  runningJobCreatedAt?: string | null;
};

type NotificationsSettingsProps = {
  reportData?: ReportData;
  initialSubTab?: SubTabKey;
};

const SUB_TABS: Array<{ key: SubTabKey; label: string; description: string; icon: typeof Bell }> = [
  {
    key: "realtime",
    label: "Tempo Real",
    description: "Alertas WhatsApp acionados por eventos",
    icon: Bell,
  },
  {
    key: "periodic",
    label: "Periódico",
    description: "Relatórios semanais automatizados",
    icon: Calendar,
  },
];

export function NotificationsSettings({ reportData, initialSubTab }: NotificationsSettingsProps) {
  const [subTab, setSubTab] = useState<SubTabKey>(initialSubTab ?? "realtime");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Notificações</h2>
        <p className="mt-0.5 text-sm text-muted">
          Mensagens enviadas ao gestor via WhatsApp, independente do agente de IA do Evo CRM.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-primary-light/20 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted">
            <span className="font-medium text-text">Diferença do agente do CRM:</span>{" "}
            esses avisos são enviados para o gestor. O agente do Evo CRM atua dentro das conversas
            com o cliente.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === "realtime" ? <AlertsSettings /> : null}

      {subTab === "periodic" ? (
        reportData ? (
          <PeriodicSection data={reportData} />
        ) : (
          <p className="text-sm text-muted">
            Dados de relatório indisponíveis. Recarregue a página.
          </p>
        )
      ) : null}
    </div>
  );
}

function PeriodicSection({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-text">Relatório Semanal</h3>
        <p className="mt-0.5 text-sm text-muted">
          Enviado toda segunda-feira às 08:00 para o gestor cadastrado.
        </p>
      </div>

      <IntegrationsStatusCard integrations={data.integrations} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NextReportCard
          nextSendAtLabel={data.nextSendAtLabel}
          managerPhone={data.managerPhone}
          evolutionStatus={data.evolutionStatus}
          canManageReports={data.canManageReports}
          canSendNow={data.canSendNow}
          sendDisabledReason={data.sendDisabledReason}
        />
        <RecentReportsCard
          reports={data.recentReports}
          hasRunningJob={data.hasRunningJob}
          runningJobCreatedAt={data.runningJobCreatedAt}
        />
      </div>
    </div>
  );
}
