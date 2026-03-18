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
  Building2,
  FileText,
  Plug,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/forms/company-settings-form";
import { SocialConnectionsSettings } from "@/components/forms/social-connections-settings";
import { IntegrationsSettingsForm } from "@/components/forms/integrations-settings-form";
import {
  IntegrationsStatusCard,
  type IntegrationStatusItem,
} from "@/components/dashboard/integrations-status-card";
import { NextReportCard } from "@/components/dashboard/next-report-card";
import {
  RecentReportsCard,
  type RecentReportItem,
} from "@/components/dashboard/recent-reports-card";
import { AlertsSettings } from "@/components/settings/alerts-settings";

type TabKey = "overview" | "company" | "integrations" | "social" | "reports" | "alerts";

type SettingsStats = {
  companyConfigured: boolean;
  socialConnections: number;
  totalSocialPlatforms: number;
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
    key: "integrations" as const,
    label: "Integrações",
    icon: Plug,
    description: "Conexões com sistemas externos",
  },
  {
    key: "social" as const,
    label: "Redes Sociais",
    icon: Share2,
    description: "Conexões de redes sociais",
  },
  {
    key: "reports" as const,
    label: "Relatórios",
    icon: FileText,
    description: "Relatório semanal e histórico",
  },
  {
    key: "alerts" as const,
    label: "Alertas",
    icon: Bell,
    description: "Alertas em tempo real via WhatsApp",
  },
];

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
  initialStats?: Partial<SettingsStats>;
  reportData?: ReportData;
  initialTab?: TabKey;
};

const VALID_TABS: TabKey[] = ["overview", "company", "integrations", "social", "reports", "alerts"];

export function SettingsLayout({ initialStats, reportData, initialTab }: SettingsLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : "overview"
  );

  useEffect(() => {
    if (initialTab && VALID_TABS.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Default stats (can be populated from props)
  const stats: SettingsStats = {
    companyConfigured: initialStats?.companyConfigured ?? true,
    socialConnections: initialStats?.socialConnections ?? 0,
    totalSocialPlatforms: initialStats?.totalSocialPlatforms ?? 3,
    integrationsActive: initialStats?.integrationsActive ?? 0,
    totalIntegrations: initialStats?.totalIntegrations ?? 2,
    lastUpdate: initialStats?.lastUpdate ?? null,
  };

  const completionPercentage = Math.round(
    ((Number(stats.companyConfigured) +
      stats.socialConnections / stats.totalSocialPlatforms +
      stats.integrationsActive / stats.totalIntegrations) / 3) * 100
  );

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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text">{completionPercentage}%</p>
              <p className="text-xs text-muted">Configuração completa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs (desktop) */}
        <div className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-border pr-4 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm rounded-lg transition-all ${
                  isActive
                    ? "text-primary bg-primary-light font-medium"
                    : "text-muted hover:text-text hover:bg-sidebar"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Tabs (horizontal scroll) */}
        <div className="md:hidden border-b border-border -mx-4 px-4 mb-4">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm rounded-lg transition-all ${
                    isActive
                      ? "text-primary bg-primary-light font-medium"
                      : "text-muted hover:text-text hover:bg-sidebar"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 animate-in fade-in duration-200">
          {activeTab === "overview" && <OverviewTab stats={stats} onNavigate={setActiveTab} />}
          {activeTab === "company" && <CompanyTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "social" && <SocialTab />}
          {activeTab === "reports" && reportData && <ReportsTab data={reportData} />}
          {activeTab === "alerts" && <AlertsTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, onNavigate }: { stats: SettingsStats; onNavigate: (tab: TabKey) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
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

        {/* Social Connections Status */}
        <Card
          className="cursor-pointer transition-all border border-border rounded-xl hover:border-border-strong"
          onClick={() => onNavigate("social")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Share2 className="h-8 w-8 text-primary" />
              <div className="flex items-center gap-1">
                <span className="text-2xl font-semibold text-text">
                  {stats.socialConnections}
                </span>
                <span className="text-sm text-muted">
                  /{stats.totalSocialPlatforms}
                </span>
              </div>
            </div>
            <CardTitle className="text-lg text-text">Redes Sociais</CardTitle>
            <CardDescription className="text-muted">
              {stats.socialConnections === 0
                ? "Nenhuma conectada"
                : `${stats.socialConnections} conectada(s)`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-sidebar rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${(stats.socialConnections / stats.totalSocialPlatforms) * 100}%`
                  }}
                />
              </div>
              <span className="text-xs text-muted">
                {Math.round((stats.socialConnections / stats.totalSocialPlatforms) * 100)}%
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-xs text-muted mt-1">Sofia CRM, Evolution API</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("social")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:bg-background"
            >
              <Share2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-text">Conectar Redes</p>
                <p className="text-xs text-muted mt-1">Instagram, LinkedIn, TikTok</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate("alerts")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:bg-background"
            >
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-text">Alertas WhatsApp</p>
                <p className="text-xs text-muted mt-1">Notificacoes em tempo real</p>
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
              Configure suas integrações para começar a usar todos os recursos do AXIOMIX.
              Comece conectando suas redes sociais para publicar conteúdo automaticamente.
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

function SocialTab() {
  return (
    <div className="space-y-6">
      <SocialConnectionsSettings />
    </div>
  );
}

function ReportsTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Relatório Semanal</h2>
        <p className="mt-0.5 text-sm text-muted">
          Controle de envio e histórico de relatórios automáticos.
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

function AlertsTab() {
  return (
    <div className="space-y-6">
      <AlertsSettings />
    </div>
  );
}
