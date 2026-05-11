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
  Plug,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Users
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CompanySettingsForm } from "@/components/forms/company-settings-form";
import { IntegrationsSettingsForm } from "@/components/forms/integrations-settings-form";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { GroupAgentSettings } from "@/components/settings/group-agent-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { SessionsPanelClient } from "@/components/whatsapp/sessions-panel-client";

type TabKey = "overview" | "company" | "team" | "integrations" | "connections" | "notifications" | "group-agent";

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
    key: "connections" as const,
    label: "Conexões WhatsApp",
    icon: MessageSquare,
    description: "Sessões ativas e expirações",
  },
  {
    key: "notifications" as const,
    label: "Notificações",
    icon: Bell,
    description: "Alertas em tempo real",
  },
  {
    key: "group-agent" as const,
    label: "Agente de Grupo",
    icon: Bot,
    description: "IA para grupos WhatsApp",
  },
] as const;

type TabDefinition = (typeof TABS)[number];

const TAB_GROUPS: Array<{ label: string; keys: TabKey[] }> = [
  { label: "Empresa", keys: ["overview", "company", "team"] },
  { label: "Integrações", keys: ["integrations", "connections"] },
  { label: "Automação", keys: ["group-agent", "notifications"] },
];

function getTab(key: TabKey): TabDefinition | undefined {
  return TABS.find((tab) => tab.key === key);
}

type SettingsLayoutProps = {
  companyId: string;
  initialStats?: Partial<SettingsStats>;
  initialTab?: TabKey | string;
  userRole?: "owner" | "admin" | "member";
};

const VALID_TABS: TabKey[] = ["overview", "company", "team", "integrations", "connections", "notifications", "group-agent"];

const LEGACY_TAB_MAP: Record<string, TabKey> = {
  reports: "notifications",
  alerts: "notifications",
  social: "integrations",
  sessoes: "connections",
  sessions: "connections",
  conexoes: "connections",
};

function resolveInitialTab(input: TabKey | string | undefined): TabKey {
  if (!input) return "overview";
  if (VALID_TABS.includes(input as TabKey)) return input as TabKey;
  const mapped = LEGACY_TAB_MAP[input];
  return mapped ?? "overview";
}

export function SettingsLayout({ companyId, initialStats, initialTab, userRole }: SettingsLayoutProps) {
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
          {activeTab === "connections" && <SessionsPanelClient companyId={companyId} />}
          {activeTab === "notifications" && <NotificationsSettings />}
          {activeTab === "group-agent" && <GroupAgentTab companyId={companyId} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, onNavigate }: { stats: SettingsStats; onNavigate: (tab: TabKey) => void }) {
  const integrationsPercent = stats.totalIntegrations > 0
    ? Math.round((stats.integrationsActive / stats.totalIntegrations) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Empresa */}
        <button
          type="button"
          onClick={() => onNavigate("company")}
          className="group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-card-modern transition-all hover:-translate-y-0.5 hover:shadow-card-hover-modern"
        >
          <div className="flex w-full items-start justify-between gap-3">
            <p className="section-label">Empresa</p>
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                stats.companyConfigured ? "bg-success-light" : "bg-warning-light"
              )}
            >
              {stats.companyConfigured ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
            </span>
          </div>
          <p className="ax-metric-lg text-text">
            {stats.companyConfigured ? "OK" : "—"}
          </p>
          <p className="text-xs text-muted">
            {stats.companyConfigured ? "Configurada" : "Configuração pendente"}
          </p>
          <div className="mt-auto flex items-center gap-2 text-xs text-muted">
            <Clock className="h-3 w-3" />
            {stats.lastUpdate
              ? `Atualizado ${new Date(stats.lastUpdate).toLocaleDateString("pt-BR")}`
              : "Não atualizado"}
          </div>
        </button>

        {/* Integrações */}
        <button
          type="button"
          onClick={() => onNavigate("integrations")}
          className="group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-card-modern transition-all hover:-translate-y-0.5 hover:shadow-card-hover-modern"
        >
          <div className="flex w-full items-start justify-between gap-3">
            <p className="section-label">Integrações ativas</p>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
              <Plug className="h-4 w-4 text-primary" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="ax-metric-lg text-text">
              {stats.integrationsActive}
            </span>
            <span className="text-sm text-muted tabular-nums">
              / {stats.totalIntegrations}
            </span>
          </div>
          <p className="text-xs text-muted">
            {stats.integrationsActive === 0
              ? "Nenhuma ativa"
              : `${stats.integrationsActive} ativa${stats.integrationsActive === 1 ? "" : "s"}`}
          </p>
          <div className="mt-auto flex w-full items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${integrationsPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted">
              {integrationsPercent}%
            </span>
          </div>
        </button>
      </div>

      {/* Ações Rápidas */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card-modern">
        <div className="mb-4">
          <p className="section-label">Ações rápidas</p>
          <p className="mt-1 text-xs text-muted">Configure os principais recursos sem sair daqui.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { tab: "company" as const, icon: Building2, label: "Editar empresa", sub: "Nome, nicho e logo" },
            { tab: "integrations" as const, icon: Plug, label: "Configurar integrações", sub: "Evo CRM, Evolution API" },
            { tab: "notifications" as const, icon: Bell, label: "Notificações", sub: "Alertas em tempo real" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => onNavigate(action.tab)}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{action.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{action.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Help */}
      <section className="rounded-xl border border-border bg-primary-light/30 p-5">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
            <AlertCircle className="h-5 w-5 text-primary" />
          </span>
          <div className="space-y-1">
            <p className="section-label">Precisa de ajuda?</p>
            <p className="text-xs leading-5 text-muted">
              Complete os dados da empresa e conecte o Evo CRM e a Evolution API
              pra que seus agentes IA possam atender pelo WhatsApp.
            </p>
          </div>
        </div>
      </section>
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
