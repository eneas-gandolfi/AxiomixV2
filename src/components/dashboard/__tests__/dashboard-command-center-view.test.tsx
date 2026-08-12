/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCommandCenterView } from "@/components/dashboard/dashboard-command-center-view";
import type { DashboardCommandCenterData } from "@/components/dashboard/dashboard-command-center-view";

const data: DashboardCommandCenterData = {
  greeting: "Bom dia",
  companyName: "Axiomix",
  stalled: {
    count: 2,
    topItem: {
      conversationId: "conv-1",
      customerName: "Cantos de Memórias",
      waitSeconds: 36_000,
    },
  },
  kpis: {
    attention: 2,
    groupsMonitored: 7,
    activeGroups: 5,
    messages24h: 148,
    aiResponses24h: 17,
    opportunities: 3,
  },
  groups: [
    {
      id: "vip",
      name: "VIP Lançamento Agosto",
      action: "Responder prazo e acionar responsável.",
      messages24h: 18,
      people24h: 9,
      status: "Risco",
    },
    {
      id: "leads",
      name: "Comunidade Leads Premium",
      action: "Enviar oferta e próximo horário.",
      messages24h: 64,
      people24h: 21,
      status: "Quente",
    },
    {
      id: "sp",
      name: "Clientes Ativos SP",
      action: "Grupo ativo, sem bloqueio comercial.",
      messages24h: 31,
      people24h: 12,
      status: "OK",
    },
  ],
  signals: [
    {
      id: "s1",
      groupName: "Grupo VIP",
      kind: "Pendência",
      time: "11:40",
      text: "Cliente pediu prazo antes de fechar.",
    },
    {
      id: "s2",
      groupName: "Leads Premium",
      kind: "Oportunidade",
      time: "11:20",
      text: "Perguntas sobre plano anual e desconto.",
    },
  ],
  health: {
    evoCrm: "OK",
    aiBase: "Ação",
    openRouter: "OK",
  },
};

describe("DashboardCommandCenterView", () => {
  it("renders the approved command-center dashboard instead of the old hero dashboard", () => {
    render(<DashboardCommandCenterView data={data} />);

    expect(screen.getByRole("heading", { name: "Bom dia, Axiomix." })).toBeInTheDocument();
    expect(screen.getByText("Seu painel abre direto no que precisa de decisão.")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Próxima ação" })).toBeInTheDocument();
    expect(screen.getByText("Retomar conversa com Cantos de Memórias")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir conversa/i })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence?modo=agora",
    );

    expect(screen.getByRole("heading", { name: "Fila de hoje" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resumo operacional" })).toBeInTheDocument();

    const radar = screen.getByLabelText("Radar de grupos WhatsApp");
    expect(within(radar).getByText("VIP Lançamento Agosto")).toBeInTheDocument();
    expect(within(radar).getByText("Comunidade Leads Premium")).toBeInTheDocument();
    expect(within(radar).getByText("Clientes Ativos SP")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Eventos da IA" })).toBeInTheDocument();
    expect(screen.getByText("Últimas respostas, alertas e leituras detectadas nos grupos.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gargalos de vendas" })).toBeInTheDocument();
    expect(screen.getByText("Sem resposta longa")).toBeInTheDocument();
    expect(screen.getAllByText(/OpenRouter/).length).toBeGreaterThan(0);
  });

  it("keeps operational status in one compact strip without oversized empty cards", () => {
    render(<DashboardCommandCenterView data={data} />);

    const operational = screen.getByLabelText("Estado operacional");
    expect(within(operational).getByText("Risco")).toBeInTheDocument();
    expect(within(operational).getByText("2 pendências")).toBeInTheDocument();
    expect(within(operational).getByText("Oportunidades")).toBeInTheDocument();
    expect(within(operational).getByText("3 ativas")).toBeInTheDocument();
    expect(within(operational).getByText("Saúde")).toBeInTheDocument();
    expect(within(operational).getByText("Evo OK · IA Ação · OpenRouter OK")).toBeInTheDocument();
    expect(within(operational).queryByText("Priorize antes de prospectar.")).not.toBeInTheDocument();
  });

  it("uses the lower left dashboard space for compact operational shortcuts instead of leaving an empty column", () => {
    render(<DashboardCommandCenterView data={data} />);

    const leftColumn = screen.getByLabelText("Leitura operacional principal");
    const shortcuts = within(leftColumn).getByLabelText("Atalhos operacionais");
    expect(shortcuts).toBeInTheDocument();
    expect(within(shortcuts).getByText("Ações rápidas")).toBeInTheDocument();
    expect(within(shortcuts).getByText("Atalhos para investigar grupos, conversas e configurações.")).toBeInTheDocument();
    expect(within(leftColumn).getByRole("link", { name: /Grupos/i })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence",
    );
    expect(within(leftColumn).getByRole("link", { name: /Conversas/i })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence?modo=agora",
    );
    expect(within(leftColumn).getByRole("link", { name: /Configurar/i })).toHaveAttribute(
      "href",
      "/settings?tab=group-agent",
    );
  });
});
