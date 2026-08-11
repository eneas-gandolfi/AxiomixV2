/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperacaoLivePanel } from "../operacao-live-panel";
import type { LiveOperationData } from "@/lib/whatsapp/live-operation";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function makeLiveData(): LiveOperationData {
  return {
    mostForgotten: {
      conversationId: "conv-1",
      customerName: "Graça Maria",
      customerPhone: "+5500000000000",
      customerAvatar: null,
      assigneeId: null,
      assigneeName: null,
      lastMessage: "Sem previa da ultima mensagem.",
      lastMessageType: "text",
      lastInboundAt: "2026-08-05T21:03:00.000Z",
      waitSeconds: 597_600,
      severity: "red",
      pipelineStage: null,
      labels: [],
    },
    inRiskQueue: [
      {
        conversationId: "conv-2",
        customerName: "Maria Cátia Antunes",
        customerPhone: "+5511999999999",
        customerAvatar: null,
        assigneeId: null,
        assigneeName: null,
        lastMessage: "Tô começando agora",
        lastMessageType: "text",
        lastInboundAt: "2026-08-05T21:03:00.000Z",
        waitSeconds: 597_600,
        severity: "red",
        pipelineStage: null,
        labels: [],
      },
    ],
    operators: [],
    thresholds: {
      amberSeconds: 1_800,
      redSeconds: 7_200,
      nicheSlug: null,
    },
    totalWaiting: 2,
    stalledCount: 2,
    isCurrentlyOpen: true,
    hasBusinessHours: false,
  };
}

describe("OperacaoLivePanel compact layout", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: makeLiveData(),
        context: { currentUserId: "user-1", companyId: "company-1" },
      }),
    });
  });

  it("keeps immediate-action cards compact and scannable", async () => {
    render(<OperacaoLivePanel />);

    const customerName = await screen.findByRole("heading", { name: "Graça Maria" });
    const heroCard = customerName.closest("section");

    expect(heroCard).toHaveClass("p-5");
    expect(heroCard).not.toHaveClass("p-7");
    expect(customerName).toHaveClass("text-xl");
    expect(customerName).not.toHaveClass("md:text-3xl");

    expect(screen.getByRole("button", { name: /^Assumir$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Abrir$/ })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence/conversas/conv-1",
    );
  });
});
