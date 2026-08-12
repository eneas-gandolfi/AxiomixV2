/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroupsRadarPage } from "../groups-radar-page";
import type { GroupRadarData } from "@/services/group-intelligence/queries";

vi.mock("@/services/group-intelligence/queries", () => ({
  getGroupRadarData: vi.fn(async (): Promise<GroupRadarData> => ({
    summary: {
      totalGroups: 44,
      activeGroups: 1,
      hotGroups: 0,
      riskGroups: 0,
      messages24h: 12,
      agentResponses24h: 4,
    },
    groups: [],
    insights: [
      {
        id: "insight-1",
        groupName: "Anotações",
        kind: "response",
        text: "OpenRouter sem saldo. Recarregue créditos.",
        configId: "group-1",
        source: null,
        score: 1,
        createdAt: "2026-08-11T19:10:00.000Z",
      },
    ],
    activityBuckets24h: [
      { label: "00h", count: 0 },
      { label: "03h", count: 0 },
      { label: "06h", count: 0 },
      { label: "09h", count: 4 },
      { label: "12h", count: 3 },
      { label: "15h", count: 5 },
      { label: "18h", count: 0 },
      { label: "21h", count: 0 },
    ],
  })),
}));

describe("GroupsRadarPage", () => {
  it("fills the signals rail with a compact operation health card", async () => {
    render(await GroupsRadarPage({ companyId: "18b641e2-7c73-4fa7-9831-cc7c0eb967b6" }));

    expect(screen.getByRole("heading", { name: "Eventos da IA" })).toBeInTheDocument();
    expect(screen.getByText("Últimas respostas, alertas e leituras detectadas nos grupos.")).toBeInTheDocument();
    const healthPanel = screen.getByRole("heading", { name: "Saúde da operação" }).closest("section");
    expect(healthPanel).not.toBeNull();
    expect(screen.getByText(/sem área vazia/i)).toBeInTheDocument();
    expect(within(healthPanel as HTMLElement).getByText("43")).toBeInTheDocument();
  });
});
