/**
 * Arquivo: src/components/settings/settings-layout.tsx
 * Propósito: Layout profissional de Settings com tabs e overview
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  Building2,
  Coins,
  Plug,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/forms/company-settings-form";
import { IntegrationsSettingsForm } from "@/components/forms/integrations-settings-form";
import type { IntegrationStatusItem } from "@/components/dashboard/integrations-status-card";
import type { RecentReportItem } from "@/components/dashboard/recent-reports-card";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { GroupAgentSettings } from "@/components/settings/group-agent-settings";
import { AiUsagePanel } from "@/components/settings/ai-usage-panel";
import { TeamSettings } from "@/components/settings/team-settings";

type TabKey = "overview" | "company" | "team" | "integrations" | "notifications" | "group-agent" | "usage";

type SettingsStats = {
  companyConfigured: boolean;
  integrationsActive: number;
  totalIntegrations: number;
  lastUpdate: string | null;
};

const TABS = [
  {
    key: "overview" as const,
    label: "Visão Geral",
    icon: TrendingUp,
    description: "Dashboard de configurações",
  },
  {
    key: "company" as const,
    label: "Empresa",
    icon: Building2,
    description: "Informações da empresa",
  },
  {
    key: "team" as const,
    label: "Equipe",
    icon: Users,
    description: "Membros e permissões",
    privilegedOnly: true,
  },
  {
    key: "integrations" as const,
    label: "Integrações",
    icon: Plug,
    description: "Conexões com sistemas externos",
  },
  {
    key: "notifications" as const,
    label: "Notificações",
    icon: Bell,
    description: "Alertas em tempo real e relatórios periódicos",
  },
  {
    key: "group-agent" as const,
    label: "Agente de Grupo",
    icon: Bot,
    description: "IA para grupos WhatsApp",
  },
  {
    key: "usage" as const,
    label: "Uso & Custos",
    icon: Coins,
    description: "Consumo de IA e custos estimados",
    privilegedOnly: true,
  },
] as const;

type TabDefinition = (typeof TABS)[number];

const TAB_GROUPS: Array<{ label: string; keys: TabKey[] }> = [
  { label: "Empresa", keys: ["overview", "company", "team"] },
  { label: "Integrações", keys: ["integrations"] },
  { label: "Automação", keys: ["group-agent", "notifications"] },
  { label: "Avançado", keys: ["usage"] },
];

function getTab(key: TabKey): TabDefinition | undefined {
  return TABS.find((tab) => tab.key === key);
}

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

type SettingsLayoutProps = {
  companyId: string;
  initialStats?: Partial<SettingsStats>;
  reportData?: ReportData;
  initialTab?: TabKey | string;
  userRole?: "owner" | "admin" | "member";
};

const VALID_TABS: TabKey[] = ["overview", "company", "team", "integrations", "notifications", "group-agent", "usage"];

const LEGACY_TAB_MAP: Record<string, TabKey> = {
  reports: "notifications",
  alerts: "notifications",
  social: "integrations",
};

function resolveInitialTab(input: TabKey | string | undefined): TabKey {
  if (!input) return "overview";
  if (VALID_TABS.includes(input as TabKey)) return input as TabKey;
  const mapped = LEGACY_TAB_MAP[input];
  return mapped ?? "overview";
}

export function SettingsLayout({ companyId, initialStats, reportData, initialTab, userRole }: SettingsLayoutProps) {
  const canViewUsage = userRole === "owner" || userRole === "admin";
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveInitialTab(initialTab));

  useEffect(() => {
    setActiveTab(resolveInitialTab(initialTab));
  }, [initialTab]);

  // Default stats (can be populated from props)
  const stats: SettingsStats = {
    companyConfigured: initialStats?.companyConfigured ?? true,
    integrationsActive: initialStats?.integrationsActive ?? 0,
    totalIntegrations: initialStats?.totalIntegrations ?? 2,
    lastUpdate: initialStats?.lastUpdate ?? null,
  };

  const integrationsConfigured = stats.integrationsActive >= stats.totalIntegrations;
  const allConfigured = stats.companyConfigured && integrationsConfigured;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text">Configurações</h1>
          <p className="mt-1 text-sm text-muted">
            Gerencie sua empresa, integrações e conexões
          </p>
        </div>

        <Card className="border border-border rounded-xl">
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                allConfigured ? "bg-success-light" : "bg-primary-light"
              }`}
            >
              {allConfigured ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <AlertCircle className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-text">
                {allConfigured ? "Tudo configurado" : "Configuração pendente"}
              </p>
              <p className="text-xs text-muted">
                {stats.companyConfigured ? "Empresa OK" : "Empresa pendente"}
                {" · "}
                {integrationsConfigured
                  ? "Integrações OK"
                  : `Integrações ${stats.integrationsActive}/${stats.totalIntegrations}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs (desktop) — agrupadas */}
        <div className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-border pr-4 space-y-5">
          {TAB_GROUPS.map((group) => {
            const visibleTabs = group.keys
              .map(getTab)
              .filter((tab): tab is TabDefinition => {
                if (!tab) return false;
                return !("privilegedOnly" in tab && tab.privilegedOnly) || canViewUsage;
              });

            if (visibleTabs.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <p className="px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-light">
                  {group.label}
                </p>
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex w-full items-center gap-2 whitespace-nowrap px-4 py-2 text-sm rounded-lg transition-all ${
                        isActive
                          ? "text-primary bg-primary-light font-medium"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Mobile Tabs (acordeão por grupo) */}
        <div className="md:hidden border-b border-border -mx-4 px-4 mb-4 space-y-3">
          {TAB_GROUPS.map((group) => {
            const visibleTabs = group.keys
              .map(getTab)
              .filter((tab): tab is TabDefinition => {
                if (!tab) return false;
                return !("privilegedOnly" in tab && tab.privilegedOnly) || canViewUsage;
              });

            if (visibleTabs.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-light mb-1.5">
                  {group.label}
                </p>
                <div className="flex gap-1 overflow-x-auto">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-all ${
                          isActive
                            ? "text-primary bg-primary-light font-medium"
                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 animate-in fade-in duration-200">
          {activeTab === "overview" && <OverviewTab stats={stats} onNavigate={setActiveTab} />}
          {activeTab === "company" && <CompanyTab />}
          {activeTab === "team" && canViewUsage && <TeamSettings />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "notifications" && <NotificationsSettings reportData={reportData} />}
          {activeTab === "group-agent" && <GroupAgentTab companyId={companyId} />}
          {activeTab === "usage" && canViewUsage && <AiUsagePanel />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, onNavigate }: { stats: SettingsStats; onNavigate: (tab: TabKey) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Company Status */}
        <Card
          className="cursor-pointer transition-all border border-border rounded-xl hover:border-border-strong"
          onClick={() => onNavigate("company")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Building2 className="h-8 w-8 text-primary" />
              {stats.companyConfigured ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
            </div>
            <CardTitle className="text-lg text-text">Empresa</CardTitle>
            <CardDescription className="text-muted">
              {stats.companyConfigured ? "Configurada" : "Configuração pendente"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Clock className="h-3 w-3" />
              {stats.lastUpdate
                ? `Atualizado ${new Date(stats.lastUpdate).toLocaleDateString("pt-BR")}`
                : "Não atualizado"
              }
            </div>
          </CardContent>
        </Card>

        {/* Integrations Status */}
        <Card
          className="cursor-pointer transition-all border border-border rounded-xl hover:border-border-strong"
          onClick={() => onNavigate("integrations")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Plug className="h-8 w-8 text-primary" />
              <div className="flex items-center gap-1">
                <span className="text-2xl font-semibold text-text">
                  {stats.integrationsActive}
                </span>
                <span className="text-sm text-muted">
                  /{stats.totalIntegrations}
                </span>
              </div>
            </div>
            <CardTitle className="text-lg text-text">Integrações</CardTitle>
            <CardDescription className="text-muted">
              {stats.integrationsActive === 0
                ? "Nenhuma ativa"
                : `${stats.integrationsActive} ativa(s)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-sidebar rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${(stats.integrationsActive / stats.totalIntegrations) * 100}%`
                  }}
                />
              </div>
              <span className="text-xs text-muted">
                {Math.round((stats.integrationsActive / stats.totalIntegrations) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-text">Ações Rápidas</CardTitle>
          <CardDescription className="text-muted">Configure rapidamente os principais recursos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => onNavigate("company")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:bg-background"
            >
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-text">Editar Empresa</p>
                <p className="text-xs text-muted mt-1">Nome, nicho e logo</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("integrations")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:bg-background"
            >
              <Plug className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-text">Configurar Integrações</p>
                <p className="text-xs text-muted mt-1">Evo CRM, Evolution API</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("notifications")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:bg-background"
            >
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-text">Notificações</p>
                <p className="text-xs text-muted mt-1">Alertas e relatórios via WhatsApp</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border border-border rounded-xl bg-primary-light/30">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm text-text">Precisa de ajuda?</p>
            <p className="text-xs text-muted">
              Complete os dados da empresa e conecte o Evo CRM e a Evolution API
              para que seus agentes IA possam atender pelo WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompanyTab() {
  return (
    <div className="space-y-6">
      <CompanySettingsForm />
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <IntegrationsSettingsForm />
    </div>
  );
}

function GroupAgentTab({ companyId }: { companyId: string }) {
  return (
    <div className="space-y-6">
      <GroupAgentSettings companyId={companyId} />
    </div>
  );
}
