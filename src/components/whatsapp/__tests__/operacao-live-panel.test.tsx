/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    const gracaEntries = screen.getAllByText("Graça Maria");
    expect(gracaEntries[0]).toBeInTheDocument();
    expect(gracaEntries[0].closest("article")).not.toHaveClass("min-h-[210px]");
    expect(screen.getAllByText("Alice2793").length).toBeGreaterThan(0);
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
    expect(screen.getByText("Gargalos da fila")).toBeInTheDocument();
    expect(screen.getByText("4 sem atendente")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/whatsapp/live-operation", {
        method: "GET",
        cache: "no-store",
      });
    });
  });

  it("allows selecting multiple visible conversations to analyze with IA", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/whatsapp/live-operation") {
        return Response.json({
          data: liveData,
          context: { currentUserId: "u-1", companyId: "company-1" },
        });
      }
      if (url === "/api/whatsapp/analyze" && init?.method === "POST") {
        return Response.json({ ok: true });
      }
      return Response.json({ error: "unexpected request" }, { status: 500 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<OperacaoLivePanel />);

    await screen.findByText("Conversas individuais");
    await user.click(screen.getByRole("button", { name: "Selecionar conversas" }));
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Graça Maria" }));
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Alice2793" }));

    expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Analisar com IA" }));

    await waitFor(() => {
      const analyzeCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "/api/whatsapp/analyze");
      expect(analyzeCalls).toHaveLength(2);
    });
    expect(screen.getByText("2 análises concluídas")).toBeInTheDocument();
  });

  it("opens a modal with all visible individual conversations and keeps direct access to the complete inbox", async () => {
    const user = userEvent.setup();

    render(<OperacaoLivePanel />);

    await screen.findByText("Conversas individuais");
    await user.click(screen.getByRole("button", { name: "Ver todas as conversas" }));

    const dialog = screen.getByRole("dialog", { name: "Todas as conversas individuais" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("5 conversas na fila atual")).toBeInTheDocument();
    expect(within(dialog).getByText("Graça Maria")).toBeInTheDocument();
    expect(within(dialog).getByText("Cristina De Vargas")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Abrir lista completa" })).toHaveAttribute(
      "href",
      "/whatsapp-intelligence/conversas",
    );
    expect(within(dialog).getByRole("button", { name: "Voltar à tela anterior" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Voltar à tela anterior" }));
    expect(screen.queryByRole("dialog", { name: "Todas as conversas individuais" })).not.toBeInTheDocument();
  });

  it("shows a layout-aware skeleton while loading the live conversations", () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    render(<OperacaoLivePanel />);

    expect(screen.getByLabelText("Carregando conversas individuais")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando ação imediata")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando operadores agora")).toBeInTheDocument();
  });
});
