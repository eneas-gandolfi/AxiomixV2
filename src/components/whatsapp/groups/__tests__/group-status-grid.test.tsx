/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GroupRadarItem } from "@/services/group-intelligence/queries";
import {
  getAgentModeLabel,
  getFocusedGroups,
  GroupPriorityList,
  GroupStatusGrid,
} from "../group-status-grid";

function makeGroup(
  index: number,
  overrides: Partial<GroupRadarItem> = {}
): GroupRadarItem {
  return {
    configId: `group-${index}`,
    groupJid: `group-${index}@g.us`,
    name: `Grupo ${index}`,
    status: "inactive",
    agentMode: "radar_only",
    agentName: "Axiomix",
    feedToRag: false,
    messageCount24h: 0,
    triggerCount24h: 0,
    agentResponses24h: 0,
    uniqueSenders24h: 0,
    lastMessageAt: null,
    lastMessagePreview: null,
    ...overrides,
  };
}

describe("getAgentModeLabel", () => {
  it("keeps all group agent modes visible", () => {
    expect(getAgentModeLabel("radar_only")).toBe("Radar");
    expect(getAgentModeLabel("trigger_only")).toBe("Trigger");
    expect(getAgentModeLabel("proactive")).toBe("Proativo");
  });
});

describe("getFocusedGroups", () => {
  it("keeps the dashboard focused on the four highest-signal groups", () => {
    const groups = [
      makeGroup(1, { name: "Risco recente", status: "risk", lastMessageAt: "2026-08-11T12:00:00.000Z" }),
      makeGroup(2, { name: "Quente", status: "hot", messageCount24h: 80 }),
      makeGroup(3, { name: "Ativo recente", status: "active", lastMessageAt: "2026-08-11T13:00:00.000Z" }),
      makeGroup(4, { name: "Ativo antigo", status: "active", lastMessageAt: "2026-08-11T10:00:00.000Z" }),
      makeGroup(5, { name: "Pouco movimento", status: "quiet", messageCount24h: 2 }),
      makeGroup(6, { name: "Inativo com mensagem", status: "inactive", messageCount24h: 1 }),
      makeGroup(7, { name: "Inativo vazio", status: "inactive" }),
      makeGroup(8, { name: "Outro inativo vazio", status: "inactive" }),
    ];

    const focused = getFocusedGroups(groups);

    expect(focused).toHaveLength(4);
    expect(focused.map((group) => group.name)).toEqual([
      "Risco recente",
      "Quente",
      "Ativo recente",
      "Ativo antigo",
    ]);
  });
});

describe("GroupStatusGrid", () => {
  it("renders compact focused groups and an operational queue", () => {
    const groups = Array.from({ length: 8 }, (_, index) =>
      makeGroup(index + 1, {
        name: `Grupo ${index + 1}`,
        status: index < 6 ? "active" : "inactive",
        messageCount24h: index < 6 ? 4 : 0,
        lastMessageAt: index < 6 ? `2026-08-11T1${index}:00:00.000Z` : null,
      })
    );

    render(<GroupStatusGrid groups={groups} />);

    expect(screen.getByRole("heading", { name: "Grupos em foco" })).toBeInTheDocument();
    expect(screen.getByText("4 grupos principais aparecem aqui; o restante fica organizado na fila.")).toBeInTheDocument();
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByText("Grupo 4")).toBeInTheDocument();
    expect(screen.queryByText("Grupo 5")).not.toBeInTheDocument();
    const queue = screen
      .getByRole("heading", { name: "Fila operacional" })
      .closest("section");

    expect(queue).not.toBeNull();
    expect(within(queue as HTMLElement).getByText("sem prioridade agora")).toBeInTheDocument();
    expect(within(queue as HTMLElement).getByText("fora da leitura principal")).toBeInTheDocument();
    expect(within(queue as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(within(queue as HTMLElement).getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/settings?tab=group-agent"
    );
  });
});

describe("GroupPriorityList", () => {
  it("does not render an empty attention card when no group needs action", () => {
    render(<GroupPriorityList groups={[makeGroup(1, { status: "active" })]} />);

    expect(screen.queryByRole("heading", { name: "Atenção agora" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sem urgências agora")).not.toBeInTheDocument();
  });
});
