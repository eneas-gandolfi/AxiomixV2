/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperacaoLivePanel } from "../operacao-live-panel";
import type { LiveOperationData } from "@/lib/whatsapp/live-operation";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const liveData: LiveOperationData = {
  mostForgotten: {
    conversationId: "c-1",
    customerName: "Graça Maria",
    customerPhone: "+5511999990000",
    customerAvatar: null,
    assigneeId: null,
    assigneeName: null,
    lastMessage: "Preciso de retorno sobre o orçamento.",
    lastMessageType: "text",
    lastInboundAt: "2026-07-26T21:03:00.000Z",
    waitSeconds: 1_400_000,
    severity: "red",
    pipelineStage: null,
    labels: [],
  },
  inRiskQueue: [
    {
      conversationId: "c-2",
      customerName: "Alice2793",
      customerPhone: "+55119981562793",
      customerAvatar: null,
      assigneeId: "u-2",
      assigneeName: "Marina",
      lastMessage: "Olá! Posso ter mais informações?",
      lastMessageType: "text",
      lastInboundAt: "2026-08-05T19:00:00.000Z",
      waitSeconds: 560_000,
      severity: "red",
      pipelineStage: "Proposta",
      labels: [],
    },
    {
      conversationId: "c-3",
      customerName: "Flávia",
      customerPhone: "+551192857738",
      customerAvatar: null,
      assigneeId: null,
      assigneeName: null,
      lastMessage: "Olá! Posso ter mais informações sobre valores?",
      lastMessageType: "text",
      lastInboundAt: "2026-08-05T19:10:00.000Z",
      waitSeconds: 500_000,
      severity: "red",
      pipelineStage: null,
      labels: [],
    },
    {
      conversationId: "c-4",
      customerName: "design de sobrancelhas",
      customerPhone: "+558799515949",
      customerAvatar: null,
      assigneeId: null,
      assigneeName: null,
      lastMessage: "Olá! Posso ter mais informações?",
      lastMessageType: "text",
      lastInboundAt: "2026-08-05T19:20:00.000Z",
      waitSeconds: 490_000,
      severity: "red",
      pipelineStage: null,
      labels: [],
    },
    {
      conversationId: "c-5",
      customerName: "Cristina De Vargas",
      customerPhone: "+555596753934",
      customerAvatar: null,
      assigneeId: null,
      assigneeName: null,
      lastMessage: "Olá! Posso ter informações sobre agenda?",
      lastMessageType: "text",
      lastInboundAt: "2026-08-05T19:30:00.000Z",
      waitSeconds: 480_000,
      severity: "red",
      pipelineStage: null,
      labels: [],
    },
  ],
  operators: [
    {
      operatorId: null,
      operatorName: null,
      activeCount: 1,
      worstWaitSeconds: 1_400_000,
      worstCustomerName: "Graça Maria",
      severity: "red",
    },
  ],
  thresholds: {
    amberSeconds: 1_800,
    redSeconds: 7_200,
    nicheSlug: null,
  },
  totalWaiting: 5,
  stalledCount: 5,
  isCurrentlyOpen: true,
  hasBusinessHours: false,
};

beforeEach(() => {
  vi.useRealTimers();
  global.fetch = vi.fn(async () =>
    Response.json({
      data: liveData,
      context: { currentUserId: "u-1", companyId: "company-1" },
    })
  ) as typeof fetch;
});

describe("OperacaoLivePanel", () => {
  it("renders individual conversations as decision sections instead of a dense label-heavy grid", async () => {
    render(<OperacaoLivePanel />);

    expect(await screen.findByText("Conversas individuais")).toBeInTheDocument();
    expect(screen.getByText("Ação imediata")).toBeInTheDocument();
    expect(screen.getByText("Fila completa")).toBeInTheDocument();
    expect(screen.getByText("Esperando")).toBeInTheDocument();
    expect(screen.getByText("Críticas")).toBeInTheDocument();
    expect(screen.getByText("Sem atendente")).toBeInTheDocument();
    expect(screen.getByText("Maior espera")).toBeInTheDocument();

    expect(screen.getByText("Graça Maria")).toBeInTheDocument();
    expect(screen.getByText("Graça Maria").closest("article")).not.toHaveClass("min-h-[210px]");
    expect(screen.getByText("Alice2793")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir Alice2793/i })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence/conversas/c-2"
    );
    expect(screen.queryByText("Cliente")).not.toBeInTheDocument();
    expect(screen.queryByText("Responsável")).not.toBeInTheDocument();
    expect(screen.queryByText("Última mensagem")).not.toBeInTheDocument();
    expect(screen.queryByText("prioridade por espera")).not.toBeInTheDocument();
    expect(screen.queryByText("Ordenada pela maior espera, com dados repetidos só no cabeçalho.")).not.toBeInTheDocument();
    expect(screen.queryByText("Abrir design de sobrancelhas")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir design de sobrancelhas/i })).toHaveTextContent(/^Abrir$/);
    expect(screen.queryByText("Outras conversas em risco")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliente prestes a desistir")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/whatsapp/live-operation", {
        method: "GET",
        cache: "no-store",
      });
    });
  });
});
