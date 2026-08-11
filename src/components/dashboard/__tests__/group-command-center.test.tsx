/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardGroupCommandCenterView } from "@/components/dashboard/group-command-center-view";
import type { GroupRadarData } from "@/services/group-intelligence/queries";

const radarData: GroupRadarData = {
  summary: {
    totalGroups: 7,
    activeGroups: 5,
    hotGroups: 1,
    riskGroups: 1,
    messages24h: 148,
    agentResponses24h: 17,
  },
  activityBuckets24h: [
    { label: "18h", count: 0 },
    { label: "21h", count: 4 },
    { label: "00h", count: 2 },
    { label: "03h", count: 0 },
    { label: "06h", count: 8 },
    { label: "09h", count: 21 },
    { label: "12h", count: 48 },
    { label: "15h", count: 65 },
  ],
  groups: [
    {
      configId: "vip",
      groupJid: "vip@g.us",
      name: "VIP Lançamento Agosto",
      status: "risk",
      agentMode: "proactive",
      agentName: "Axiomix",
      feedToRag: true,
      messageCount24h: 18,
      triggerCount24h: 2,
      agentResponses24h: 3,
      uniqueSenders24h: 9,
      lastMessageAt: "2026-08-11T14:40:00.000Z",
      lastMessagePreview: "Cliente pediu prazo antes de fechar.",
    },
    {
      configId: "leads",
      groupJid: "leads@g.us",
      name: "Comunidade Leads Premium",
      status: "hot",
      agentMode: "trigger_only",
      agentName: "Axiomix",
      feedToRag: true,
      messageCount24h: 64,
      triggerCount24h: 4,
      agentResponses24h: 8,
      uniqueSenders24h: 21,
      lastMessageAt: "2026-08-11T14:20:00.000Z",
      lastMessagePreview: "Perguntas sobre plano anual e desconto.",
    },
    {
      configId: "sp",
      groupJid: "sp@g.us",
      name: "Clientes Ativos SP",
      status: "active",
      agentMode: "radar_only",
      agentName: "Axiomix",
      feedToRag: true,
      messageCount24h: 31,
      triggerCount24h: 1,
      agentResponses24h: 4,
      uniqueSenders24h: 12,
      lastMessageAt: "2026-08-11T13:58:00.000Z",
      lastMessagePreview: "Grupo ativo, sem bloqueio comercial.",
    },
    {
      configId: "hidden",
      groupJid: "hidden@g.us",
      name: "Grupo fora do resumo",
      status: "quiet",
      agentMode: "radar_only",
      agentName: "Axiomix",
      feedToRag: false,
      messageCount24h: 2,
      triggerCount24h: 0,
      agentResponses24h: 0,
      uniqueSenders24h: 2,
      lastMessageAt: null,
      lastMessagePreview: null,
    },
  ],
  insights: [
    {
      id: "i-1",
      configId: "vip",
      groupName: "Grupo VIP",
      kind: "action_item",
      text: "Cliente pediu prazo antes de fechar.",
      source: "Maria",
      createdAt: "2026-08-11T14:40:00.000Z",
      score: 9,
    },
    {
      id: "i-2",
      configId: "leads",
      groupName: "Leads Premium",
      kind: "decision",
      text: "Perguntas sobre plano anual e desconto.",
      source: "João",
      createdAt: "2026-08-11T14:20:00.000Z",
      score: 8,
    },
  ],
};

describe("DashboardGroupCommandCenterView", () => {
  it("prioriza radar de grupos, sinais da IA e a faixa inferior compacta", () => {
    render(<DashboardGroupCommandCenterView data={radarData} />);

    expect(screen.getByRole("heading", { name: "Radar de grupos WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sinais da IA" })).toBeInTheDocument();

    const radar = screen.getByLabelText("Radar de grupos WhatsApp");
    expect(within(radar).getByText("VIP Lançamento Agosto")).toBeInTheDocument();
    expect(within(radar).getByText("Comunidade Leads Premium")).toBeInTheDocument();
    expect(within(radar).getByText("Clientes Ativos SP")).toBeInTheDocument();
    expect(within(radar).queryByText("Grupo fora do resumo")).not.toBeInTheDocument();

    const bottomRow = screen.getByLabelText("Estado operacional");
    expect(within(bottomRow).getByRole("heading", { name: "Controle de risco" })).toBeInTheDocument();
    expect(within(bottomRow).getByRole("heading", { name: "Oportunidades" })).toBeInTheDocument();
    expect(within(bottomRow).getByRole("heading", { name: "Saúde da operação" })).toBeInTheDocument();
    expect(within(bottomRow).getByText("7")).toBeInTheDocument();
    expect(within(bottomRow).getByText("grupos")).toBeInTheDocument();
  });
});
