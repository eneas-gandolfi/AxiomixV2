/**
 * @vitest-environment jsdom
 *
 * Testa os 3 dialogs de ação da conversa:
 *   - AddNoteDialog: lista + cria + apaga notas; erro com code vira PT-BR
 *   - CreateKanbanCardDialog: carrega boards, cria card, erro amigável
 *   - ChangeStatusDialog: muda status via /resolve
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddNoteDialog } from "../add-note-dialog";
import { CreateKanbanCardDialog } from "../create-kanban-card-dialog";
import { ChangeStatusDialog } from "../change-status-dialog";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

// antd (rc-resize-observer / TextArea autosize) exige ResizeObserver, que o
// jsdom não implementa.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AddNoteDialog", () => {
  it("modo controlado: abre, lista notas e cria nova", async () => {
    // GET inicial
    mockFetchOnce(200, { notes: [{ id: "n1", content: "nota antiga", created_at: "2026-07-01T12:00:00Z" }] });
    const onClose = vi.fn();
    render(
      <AddNoteDialog companyId="c-1" conversationId="conv-1" open onClose={onClose} />,
    );

    expect(await screen.findByText("nota antiga")).toBeInTheDocument();

    // POST + reload
    mockFetchOnce(200, { note: { id: "n2" } });
    mockFetchOnce(200, {
      notes: [
        { id: "n2", content: "nova nota", created_at: "2026-07-27T12:00:00Z" },
        { id: "n1", content: "nota antiga", created_at: "2026-07-01T12:00:00Z" },
      ],
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Escreva uma nota/i),
      "nova nota",
    );
    await user.click(screen.getByRole("button", { name: /Adicionar nota/i }));

    expect(await screen.findByText("nova nota")).toBeInTheDocument();
    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(postCall[0]).toBe("/api/whatsapp/notes");
    expect(JSON.parse(postCall[1].body)).toMatchObject({
      companyId: "c-1",
      conversationId: "conv-1",
      content: "nova nota",
    });
  });

  it("erro do servidor vira mensagem PT-BR (sem vazar error.message)", async () => {
    mockFetchOnce(200, { notes: [] });
    render(<AddNoteDialog companyId="c-1" conversationId="conv-1" open onClose={vi.fn()} />);
    await screen.findByText(/Nenhuma nota/i);

    mockFetchOnce(500, { error: "stacktrace interna feia", code: "NOTES_ERROR" });
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Escreva uma nota/i), "x");
    await user.click(screen.getByRole("button", { name: /Adicionar nota/i }));

    expect(
      await screen.findByText(/Não foi possível salvar a nota/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stacktrace interna/i)).not.toBeInTheDocument();
  });
});

describe("CreateKanbanCardDialog", () => {
  it("carrega boards ao abrir e cria card no board escolhido", async () => {
    render(
      <CreateKanbanCardDialog
        companyId="c-1"
        conversationId="conv-1"
        defaultTitle="Maria Silva"
      />,
    );
    mockFetchOnce(200, { boards: [{ id: 7, name: "Vendas" }] });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Adicionar ao pipeline/i }));

    // board default selecionado + título sugerido
    expect(await screen.findByText("Vendas")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Maria Silva")).toBeInTheDocument();

    mockFetchOnce(200, { message: "ok" });
    await user.click(screen.getByRole("button", { name: /Criar card/i }));

    await waitFor(() => {
      const createCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(createCall[0]).toBe("/api/whatsapp/evo-actions/kanban");
      expect(JSON.parse(createCall[1].body)).toMatchObject({
        companyId: "c-1",
        conversationId: "conv-1",
        boardId: "7",
        title: "Maria Silva",
      });
    });
  });

  it("falha do Evo mostra erro amigável e mantém o modal aberto", async () => {
    render(
      <CreateKanbanCardDialog companyId="c-1" conversationId="conv-1" defaultTitle="X" />,
    );
    mockFetchOnce(200, { boards: [{ id: 1, name: "Padrão" }] });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Adicionar ao pipeline/i }));
    await screen.findByText("Padrão");

    mockFetchOnce(500, { error: "evo down", code: "EVO_KANBAN_ERROR" });
    await user.click(screen.getByRole("button", { name: /Criar card/i }));

    expect(await screen.findByText(/Não foi possível criar o card/i)).toBeInTheDocument();
  });
});

describe("ChangeStatusDialog", () => {
  it("muda status e faz router.refresh()", async () => {
    render(
      <ChangeStatusDialog companyId="c-1" conversationId="conv-1" currentStatus="open" />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status/i }));

    // abre o select do antd e escolhe "Resolvida"
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Resolvida"));

    mockFetchOnce(200, { message: "ok" });
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toBe("/api/whatsapp/resolve");
      expect(JSON.parse(call[1].body)).toMatchObject({
        companyId: "c-1",
        conversationId: "conv-1",
        status: "resolved",
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("botão Salvar desabilitado quando status não mudou", async () => {
    render(
      <ChangeStatusDialog companyId="c-1" conversationId="conv-1" currentStatus="open" />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status/i }));
    expect(screen.getByRole("button", { name: /Salvar/i })).toBeDisabled();
  });
});
