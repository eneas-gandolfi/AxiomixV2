/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsLayout } from "@/components/settings/settings-layout";

vi.mock("@/components/forms/company-settings-form", () => ({
  CompanySettingsForm: () => <section aria-label="Empresa aberta">Empresa</section>,
}));

vi.mock("@/components/forms/integrations-settings-form", () => ({
  IntegrationsSettingsForm: ({ autoOpen }: { autoOpen?: "evo" | "evolution" | null }) => (
    <section aria-label="Integrações abertas">Foco: {autoOpen ?? "nenhum"}</section>
  ),
}));

vi.mock("@/components/settings/group-agent-settings", () => ({
  GroupAgentSettings: () => <section aria-label="WhatsApp e IA aberto">WhatsApp e IA</section>,
}));

vi.mock("@/components/settings/notifications-settings", () => ({
  NotificationsSettings: () => <section aria-label="Notificações abertas">Notificações</section>,
}));

vi.mock("@/components/settings/team-settings", () => ({
  TeamSettings: () => <section aria-label="Equipe aberta">Equipe</section>,
}));

vi.mock("@/components/whatsapp/sessions-panel-client", () => ({
  SessionsPanelClient: () => <section aria-label="Conexões WhatsApp abertas">Conexões WhatsApp</section>,
}));

describe("SettingsLayout", () => {
  it("mostra uma configuração guiada com próxima ação, checklist e IA de grupos", () => {
    render(
      <SettingsLayout
        companyId="company-1"
        initialStats={{
          companyConfigured: true,
          integrationsActive: 1,
          totalIntegrations: 2,
          evoCrmActive: true,
          evolutionApiActive: false,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    const setup = screen.getByLabelText("Configuração guiada");

    expect(within(setup).getByRole("heading", { name: "Conectar WhatsApp" })).toBeInTheDocument();
    expect(within(setup).getByRole("button", { name: "Gerar QR Code" })).toBeInTheDocument();
    expect(within(setup).getByText("Progresso")).toBeInTheDocument();
    expect(within(setup).getByText("1/3")).toBeInTheDocument();

    const checklist = within(setup).getByLabelText("Checklist de configuração");
    expect(within(checklist).getByText("Empresa")).toBeInTheDocument();
    expect(within(checklist).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(checklist).getByText("IA dos grupos")).toBeInTheDocument();
    expect(within(checklist).queryByText("Evo CRM")).not.toBeInTheDocument();

    expect(within(setup).getByRole("heading", { name: "IA dos grupos WhatsApp" })).toBeInTheDocument();
    expect(within(setup).getByRole("button", { name: "Configurar IA dos grupos" })).toBeInTheDocument();
    expect(within(setup).getByRole("heading", { name: "Ajustes avançados" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Visão Geral" })).not.toBeInTheDocument();
  });

  it("prioriza o WhatsApp mesmo quando o CRM comercial ainda não está conectado", async () => {
    const user = userEvent.setup();

    render(
      <SettingsLayout
        companyId="company-1"
        initialStats={{
          companyConfigured: true,
          integrationsActive: 0,
          totalIntegrations: 2,
          evoCrmActive: false,
          evolutionApiActive: false,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    const setup = screen.getByLabelText("Configuração guiada");
    expect(within(setup).getByRole("heading", { name: "Conectar WhatsApp" })).toBeInTheDocument();

    await user.click(within(setup).getByRole("button", { name: "Gerar QR Code" }));

    expect(screen.getByLabelText("Integrações abertas")).toHaveTextContent("Foco: evolution");
  });

  it("abre a conexão WhatsApp por QR Code quando o Evo CRM já está ativo", async () => {
    const user = userEvent.setup();

    render(
      <SettingsLayout
        companyId="company-1"
        initialStats={{
          companyConfigured: true,
          integrationsActive: 1,
          totalIntegrations: 2,
          evoCrmActive: true,
          evolutionApiActive: false,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    const setup = screen.getByLabelText("Configuração guiada");
    await user.click(within(setup).getByRole("button", { name: "Gerar QR Code" }));

    expect(screen.getByLabelText("Integrações abertas")).toHaveTextContent("Foco: evolution");
  });

  it("abre o modal de conexão WhatsApp quando a URL pede connect=whatsapp", () => {
    render(
      <SettingsLayout
        companyId="company-1"
        initialTab="integrations"
        initialIntegration="whatsapp"
        initialStats={{
          companyConfigured: true,
          integrationsActive: 1,
          totalIntegrations: 2,
          evoCrmActive: true,
          evolutionApiActive: false,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    expect(screen.getByLabelText("Integrações abertas")).toHaveTextContent("Foco: evolution");
  });

  it("mantém somente as opções essenciais no menu lateral de configurações", () => {
    render(
      <SettingsLayout
        companyId="company-1"
        initialTab="company"
        initialStats={{
          companyConfigured: true,
          integrationsActive: 1,
          totalIntegrations: 2,
          evoCrmActive: true,
          evolutionApiActive: true,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    const navigation = screen.getByRole("navigation", { name: "Navegação de configurações" });

    expect(within(navigation).getByRole("button", { name: "Visão Geral" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "WhatsApp e IA" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Empresa" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Equipe" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Notificações" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Integrações" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Conexões WhatsApp" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Agente de Grupo" })).not.toBeInTheDocument();
  });

  it.each([
    ["general", "Empresa aberta"],
    ["alerts", "Notificações abertas"],
    ["social", "Integrações abertas"],
    ["connections", "WhatsApp e IA aberto"],
  ])("resolve o alias antigo %s para a seção correta", (initialTab, label) => {
    render(
      <SettingsLayout
        companyId="company-1"
        initialTab={initialTab}
        initialStats={{
          companyConfigured: true,
          integrationsActive: 1,
          totalIntegrations: 2,
          evoCrmActive: true,
          evolutionApiActive: true,
          lastUpdate: "2026-08-11T12:00:00.000Z",
        }}
        userRole="admin"
      />
    );

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });
});
