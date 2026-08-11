/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GroupRadarItem } from "@/services/group-intelligence/queries";
import { GroupStatusGrid } from "../group-status-grid";

function makeGroup(index: number, overrides: Partial<GroupRadarItem> = {}): GroupRadarItem {
  return {
    configId: `group-${index}`,
    groupJid: `group-${index}@g.us`,
    name: `Grupo ${index}`,
    status: "active",
    agentMode: "trigger_only",
    agentName: "Axiomix",
    feedToRag: true,
    messageCount24h: 4,
    triggerCount24h: 1,
    agentResponses24h: 1,
    uniqueSenders24h: 2,
    lastMessageAt: `2026-08-11T1${index % 10}:00:00.000Z`,
    lastMessagePreview: `Mensagem recente ${index}`,
    ...overrides,
  };
}

describe("GroupStatusGrid", () => {
  it("keeps the group list focused so the radar page stays fluid", () => {
    const groups = Array.from({ length: 8 }, (_, index) => makeGroup(index + 1));

    render(<GroupStatusGrid groups={groups} />);

    expect(screen.getByRole("heading", { name: "Grupos em foco" })).toBeInTheDocument();
    expect(screen.getByText("6 de 8 grupos")).toBeInTheDocument();
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByText("Grupo 6")).toBeInTheDocument();
    expect(screen.queryByText("Grupo 7")).not.toBeInTheDocument();
    expect(screen.queryByText("Grupo 8")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/settings?tab=group-agent",
    );
  });
});
