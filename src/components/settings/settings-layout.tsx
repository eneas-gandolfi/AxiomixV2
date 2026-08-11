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
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Users
} from "lucide-react";
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
  evoCrmActive?: boolean;
  evolutionApiActive?: boolean;
  groupAgentReady?: boolean;
  lastUpdate: string | null;
};

type IntegrationModalKey = "evo" | "evolution";

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
    label: "WhatsApp e IA",
    icon: Bot,
    description: "Grupos monitorados e respostas da IA",
  },
] as const;

type TabDefinition = (typeof TABS)[number];

const TAB_GROUPS: Array<{ label: string; keys: TabKey[] }> = [
  { label: "Essencial", keys: ["overview", "group-agent"] },
  { label: "Empresa", keys: ["company", "team"] },
  { label: "Sistema", keys: ["notifications"] },
];

function getTab(key: TabKey): TabDefinition | undefined {
  return TABS.find((tab) => tab.key === key);
}

type SettingsLayoutProps = {
  companyId: string;
  initialStats?: Partial<SettingsStats>;
  initialTab?: TabKey | string;
  initialIntegration?: IntegrationModalKey | "whatsapp" | string;
  userRole?: "owner" | "admin" | "member";
};

const VALID_TABS: TabKey[] = ["overview", "company", "team", "integrations", "connections", "notifications", "group-agent"];

const LEGACY_TAB_MAP: Record<string, TabKey> = {
  general: "company",
  reports: "notifications",
  alerts: "notifications",
  social: "integrations",
  connections: "group-agent",
  sessoes: "group-agent",
  sessions: "group-agent",
  conexoes: "group-agent",
};

const REQUIRED_SETUP_STEPS = 3;

function resolveInitialTab(input: TabKey | string | undefined): TabKey {
  if (!input) return "overview";
  const mapped = LEGACY_TAB_MAP[input];
  if (mapped) return mapped;
  if (VALID_TABS.includes(input as TabKey)) return input as TabKey;
  return mapped ?? "overview";
}

function resolveInitialIntegration(input: SettingsLayoutProps["initialIntegration"]): IntegrationModalKey | null {
  if (input === "evo") return "evo";
  if (input === "evolution" || input === "whatsapp") return "evolution";
  return null;
}

export function SettingsLayout({ companyId, initialStats, initialTab, initialIntegration, userRole }: SettingsLayoutProps) {
  const canViewUsage = userRole === "owner" || userRole === "admin";
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    resolveInitialIntegration(initialIntegration) ? "integrations" : resolveInitialTab(initialTab)
  );
  const [integrationAutoOpen, setIntegrationAutoOpen] = useState<IntegrationModalKey | null>(() =>
    resolveInitialIntegration(initialIntegration)
  );
  const showSettingsNavigation = activeTab !== "overview";

  useEffect(() => {
    const requestedIntegration = resolveInitialIntegration(initialIntegration);
    queueMicrotask(() => {
      if (requestedIntegration) {
        setIntegrationAutoOpen(requestedIntegration);
        setActiveTab("integrations");
        return;
      }

      setActiveTab(resolveInitialTab(initialTab));
    });
  }, [initialTab, initialIntegration]);

  // Default stats (can be populated from props)
  const stats: SettingsStats = {
    companyConfigured: initialStats?.companyConfigured ?? true,
    integrationsActive: initialStats?.integrationsActive ?? 0,
    totalIntegrations: initialStats?.totalIntegrations ?? 2,
    evoCrmActive: initialStats?.evoCrmActive,
    evolutionApiActive: initialStats?.evolutionApiActive,
    groupAgentReady: initialStats?.groupAgentReady ?? false,
    lastUpdate: initialStats?.lastUpdate ?? null,
  };

  const evolutionApiActive = stats.evolutionApiActive ?? stats.integrationsActive >= stats.totalIntegrations;
  const groupAgentReady = Boolean(stats.groupAgentReady);
  const completedSteps = [
    stats.companyConfigured,
    evolutionApiActive,
    groupAgentReady,
  ].filter(Boolean).length;

  const openIntegration = (key: IntegrationModalKey) => {
    setIntegrationAutoOpen(key);
    setActiveTab("integrations");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-text">Configurações</h1>
          <p className="mt-1 text-sm text-muted">
            Configure o WhatsApp, a equipe e a IA sem perder tempo.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted shadow-card-modern">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {completedSteps}/{REQUIRED_SETUP_STEPS} etapas prontas
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col md:flex-row gap-6">
        {showSettingsNavigation && (
          <>
            {/* Sidebar Tabs (desktop) — agrupadas */}
            <nav
              aria-label="Navegação de configurações"
              className="hidden md:flex md:w-60 md:shrink-0 md:flex-col space-y-5 border-r border-border pr-4"
            >
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
            </nav>

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
          </>
        )}

        {/* Tab Content */}
        <div className="flex-1 animate-in fade-in duration-200">
          {activeTab === "overview" && (
            <OverviewTab
              stats={stats}
              canViewUsage={canViewUsage}
              onNavigate={setActiveTab}
              onOpenIntegration={openIntegration}
            />
          )}
          {activeTab === "company" && <CompanyTab />}
          {activeTab === "team" && canViewUsage && <TeamSettings />}
          {activeTab === "integrations" && (
            <IntegrationsTab
              autoOpen={integrationAutoOpen}
              onAutoOpenHandled={() => setIntegrationAutoOpen(null)}
            />
          )}
          {activeTab === "connections" && <SessionsPanelClient companyId={companyId} />}
          {activeTab === "notifications" && <NotificationsSettings />}
          {activeTab === "group-agent" && <GroupAgentTab companyId={companyId} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  stats,
  canViewUsage,
  onNavigate,
  onOpenIntegration,
}: {
  stats: SettingsStats;
  canViewUsage: boolean;
  onNavigate: (tab: TabKey) => void;
  onOpenIntegration: (key: IntegrationModalKey) => void;
}) {
  const evolutionApiActive = stats.evolutionApiActive ?? stats.integrationsActive >= stats.totalIntegrations;
  const groupAgentReady = Boolean(stats.groupAgentReady);
  const completedSteps = [
    stats.companyConfigured,
    evolutionApiActive,
    groupAgentReady,
  ].filter(Boolean).length;

  const nextAction = !stats.companyConfigured
    ? {
        title: "Completar dados da empresa",
        description: "Confirme nome, nicho e identidade antes de ativar automações.",
        button: "Editar empresa",
        tab: "company" as const,
      }
    : !evolutionApiActive
        ? {
            title: "Conectar WhatsApp",
            description: "Gere o QR Code para capturar grupos, mensagens e alertas em tempo real.",
            button: "Gerar QR Code",
            integration: "evolution" as const,
          }
        : !groupAgentReady
          ? {
            title: "Selecionar grupos",
            description: "Escolha quais grupos serão monitorados e como a IA deve responder.",
            button: "Escolher grupos",
            tab: "group-agent" as const,
          }
          : {
              title: "Configuração pronta",
              description: "Seu WhatsApp está conectado e já existe grupo ativo para a IA monitorar.",
              button: "Revisar grupos",
              tab: "group-agent" as const,
            };

  const handleNextAction = () => {
    if ("integration" in nextAction && nextAction.integration) {
      onOpenIntegration(nextAction.integration);
      return;
    }

    onNavigate(nextAction.tab);
  };

  const evolutionDetail = evolutionApiActive ? "WhatsApp conectado" : "QR Code";
  const groupsUnlocked = evolutionApiActive;

  const setupSteps = [
    {
      label: "Empresa",
      detail: stats.companyConfigured ? "Dados básicos prontos" : "Nome, nicho e logo",
      done: stats.companyConfigured,
      tab: "company" as const,
    },
    {
      label: "WhatsApp",
      detail: evolutionDetail,
      done: evolutionApiActive,
      integration: "evolution" as const,
    },
    {
      label: "IA dos grupos",
      detail: groupAgentReady
        ? "Grupo ativo monitorado"
        : groupsUnlocked
          ? "Selecionar grupos"
          : "Libere após as conexões",
      done: groupAgentReady,
      tab: "group-agent" as const,
    },
  ];

  const openSetupStep = (step: (typeof setupSteps)[number]) => {
    if ("integration" in step && step.integration) {
      onOpenIntegration(step.integration);
      return;
    }

    onNavigate(step.tab);
  };
  const advancedActions = [
    { tab: "company" as const, icon: Building2, label: "Empresa", detail: "dados básicos" },
    ...(canViewUsage ? [{ tab: "team" as const, icon: Users, label: "Equipe", detail: "membros" }] : []),
    { tab: "integrations" as const, icon: Plug, label: "Dados comerciais", detail: "opcional" },
    { tab: "connections" as const, icon: MessageSquare, label: "Conexões", detail: "sessões" },
    { tab: "notifications" as const, icon: Bell, label: "Notificações", detail: "alertas" },
  ];

  return (
    <div aria-label="Configuração guiada" className="mx-auto max-w-5xl space-y-4">
      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-card-modern md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light text-primary">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="section-label">Próxima configuração</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-text md:text-2xl">{nextAction.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-muted">{nextAction.description}</p>
        </div>
        <button
          type="button"
          onClick={handleNextAction}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {nextAction.button}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4 shadow-card-modern">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Progresso</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-text">
                {`${completedSteps}/${REQUIRED_SETUP_STEPS}`}
              </p>
            </div>
            <div className="min-w-[148px]">
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(completedSteps / REQUIRED_SETUP_STEPS) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">etapas essenciais</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-card-modern">
          <p className="section-label">Depois disso</p>
          <p className="mt-2 text-sm font-semibold text-text">O dashboard passa a mostrar grupos, sinais da IA e oportunidades.</p>
          <p className="mt-1 text-xs leading-5 text-muted">As abas continuam abaixo para ajustes finos quando necessário.</p>
        </section>
      </div>

      <section aria-label="Checklist de configuração" className="rounded-lg border border-border bg-card p-4 shadow-card-modern">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">Checklist</h2>
          <span className="rounded-full bg-sidebar px-3 py-1 text-xs font-semibold text-muted">
            {completedSteps} concluída{completedSteps === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-2">
          {setupSteps.map((step) => (
            <button
              key={step.label}
              type="button"
              onClick={() => openSetupStep(step)}
              className="grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-sidebar px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  step.done ? "bg-success-light text-success" : "bg-warning-light text-warning"
                )}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text">{step.label}</span>
                <span className="block truncate text-xs text-muted">{step.detail}</span>
              </span>
              <span className="text-xs font-semibold text-primary">
                {step.done ? "Revisar" : "Abrir"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-card-modern md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
        <div className="min-w-0">
          <p className="section-label">Coração do projeto</p>
          <h2 className="mt-1 text-lg font-semibold leading-tight text-text">IA dos grupos WhatsApp</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-muted">
            Ative o radar dos grupos para detectar dúvidas, intenção de compra, riscos e respostas da IA.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("group-agent")}
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-text transition-colors hover:border-border-strong hover:bg-sidebar"
          >
            Configurar IA dos grupos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Radar", "grupos"],
            ["IA", "respostas"],
            ["Base", "aprendizado"],
          ].map(([value, label]) => (
            <div key={value} className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-border bg-sidebar px-2 text-center">
              <span className="text-sm font-semibold text-text">{value}</span>
              <span className="mt-1 text-[11px] font-medium text-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-card-modern">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label">Opcional</p>
            <h2 className="mt-1 text-base font-semibold text-text">Ajustes avançados</h2>
          </div>
          <span className="hidden text-xs font-medium text-muted sm:inline">abrir apenas quando precisar</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {advancedActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => onNavigate(action.tab)}
                className="grid min-h-16 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-border bg-sidebar px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">{action.label}</span>
                  <span className="block truncate text-xs text-muted">{action.detail}</span>
                </span>
              </button>
            );
          })}
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

function IntegrationsTab({
  autoOpen,
  onAutoOpenHandled,
}: {
  autoOpen: IntegrationModalKey | null;
  onAutoOpenHandled: () => void;
}) {
  return (
    <div className="space-y-6">
      <IntegrationsSettingsForm autoOpen={autoOpen} onAutoOpenHandled={onAutoOpenHandled} />
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
