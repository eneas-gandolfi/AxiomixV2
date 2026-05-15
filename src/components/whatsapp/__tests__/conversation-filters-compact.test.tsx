/**
 * @vitest-environment jsdom
 *
 * Testa o componente ConversationFiltersCompact — chip-trigger com popover.
 *   - 5 chips (Status, Sentimento, Intenção, Agente, Período) + Canal quando há inboxes
 *   - default status é "active" (espelha aba "Ativas" do Evo CRM)
 *   - selecionar opção dispara onFiltersChange com valor certo
 *   - busca dispara onFiltersChange
 *   - "Limpar filtros" volta tudo pros defaults
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationFiltersCompact } from "../conversation-filters-compact";

const renderWithMock = (overrides: Record<string, unknown> = {}) => {
  const onFiltersChange = vi.fn();
  const utils = render(
    <ConversationFiltersCompact
      onFiltersChange={onFiltersChange}
      agents={[
        { id: "ag-1", name: "Marina Silva" },
        { id: "ag-2", name: "Diego Andrade" },
      ]}
      {...overrides}
    />,
  );
  return { ...utils, onFiltersChange };
};

describe("ConversationFiltersCompact — chip-trigger", () => {
  it("renderiza os 5 chips base (Status, Sentimento, Intenção, Agente, Período)", () => {
    renderWithMock();
    expect(screen.getByRole("button", { name: /^Status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sentimento/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intenção/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Período/i })).toBeInTheDocument();
    // Canal só aparece quando há inboxes
    expect(screen.queryByRole("button", { name: /^Canal/i })).not.toBeInTheDocument();
  });

  it("default status é 'active' — chip mostra 'Status · Ativas'", () => {
    renderWithMock();
    expect(screen.getByRole("button", { name: /Status · Ativas/i })).toBeInTheDocument();
  });

  it("abrir chip Status mostra Ativas, Arquivadas, Todas e status individuais", async () => {
    renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status · Ativas/i }));

    expect(await screen.findByRole("button", { name: /^Ativas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Arquivadas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aberta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Pendente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Adiada/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Resolvida/i })).toBeInTheDocument();
  });

  it("selecionar 'Arquivadas' dispara onFiltersChange com status=archived", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status · Ativas/i }));
    await user.click(await screen.findByRole("button", { name: /^Arquivadas/i }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "archived" }),
    );
  });

  it("selecionar status individual 'Pendente' dispara onFiltersChange com status=pending", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status · Ativas/i }));
    await user.click(await screen.findByRole("button", { name: /^Pendente/i }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("abrir chip Sentimento mostra as 4 opções no popover", async () => {
    renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));

    expect(await screen.findByRole("button", { name: /Negativo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Neutro/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Positivo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sem análise/i })).toBeInTheDocument();
  });

  it("selecionar 'Negativo' dispara onFiltersChange com sentiment=negativo", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    await user.click(await screen.findByRole("button", { name: /Negativo/i }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sentiment: "negativo" }),
    );
  });

  it("após selecionar 'Negativo' o chip mostra 'Sentimento · Negativo'", async () => {
    renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    await user.click(await screen.findByRole("button", { name: /^Negativo/i }));

    expect(screen.getByRole("button", { name: /Sentimento · Negativo/i })).toBeInTheDocument();
  });

  it("digitar na busca dispara onFiltersChange.search", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    await user.type(input, "Roberta");

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "Roberta" }),
    );
  });

  it("× embutido na busca aparece quando há texto e limpa ao clicar", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    await user.type(input, "Eduardo");

    const clearBtn = screen.getByLabelText(/Limpar busca/i);
    await user.click(clearBtn);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "" }),
    );
  });

  it("'Limpar filtros' só aparece quando há filtro diferente do default e volta tudo pro default", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();

    // sem nenhum filtro alterado — botão "Limpar filtros" não existe
    expect(screen.queryByRole("button", { name: /^Limpar filtros$/i })).not.toBeInTheDocument();

    // aplica um filtro
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    await user.click(await screen.findByRole("button", { name: /^Negativo/i }));

    // agora aparece
    expect(screen.getByRole("button", { name: /^Limpar filtros$/i })).toBeInTheDocument();

    // clica em Limpar filtros — volta tudo pro default (status=active, demais=all)
    await user.click(screen.getByRole("button", { name: /^Limpar filtros$/i }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      sentiment: "all",
      intent: "all",
      status: "active",
      agent: "all",
      inbox: "all",
      period: "all",
      search: "",
    });
  });

  it("chip Agente lista os agentes passados via prop", async () => {
    renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Agente/i }));

    expect(await screen.findByRole("button", { name: /Marina Silva/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Diego Andrade/i })).toBeInTheDocument();
  });

  it("não renderiza chip Agente quando agents=[] (lista vazia)", () => {
    render(<ConversationFiltersCompact onFiltersChange={vi.fn()} agents={[]} />);
    expect(screen.queryByRole("button", { name: /^Agente/i })).not.toBeInTheDocument();
  });

  it("chip Canal aparece quando há inboxes e lista os canais com nome + tipo", async () => {
    renderWithMock({
      inboxes: [
        { id: "in-1", name: "Atendimento Geral", channel_type: "Channel::Whatsapp" },
        { id: "in-2", name: "Vendas", channel_type: null },
      ],
    });
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: /^Canal/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Canal/i }));
    expect(
      await screen.findByRole("button", { name: /Atendimento Geral.*WhatsApp/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vendas/i })).toBeInTheDocument();
  });

  it("selecionar um inbox no chip Canal dispara onFiltersChange com inbox=id", async () => {
    const { onFiltersChange } = renderWithMock({
      inboxes: [{ id: "in-7", name: "Suporte", channel_type: null }],
    });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Canal/i }));
    await user.click(await screen.findByRole("button", { name: /Suporte/i }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ inbox: "in-7" }),
    );
  });

  it("initialFilters sobrescreve default — vem com sentiment=negativo já ativo", () => {
    render(
      <ConversationFiltersCompact
        onFiltersChange={vi.fn()}
        agents={[]}
        initialFilters={{ sentiment: "negativo", period: "7" }}
      />,
    );
    expect(screen.getByRole("button", { name: /Sentimento · Negativo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Período · 7 dias/i })).toBeInTheDocument();
  });

  it("clicar fora do popover fecha ele", async () => {
    renderWithMock();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    expect(await screen.findByRole("button", { name: /^Negativo/i })).toBeInTheDocument();

    // click fora — direto no body
    await user.click(document.body);
    expect(screen.queryByRole("button", { name: /^Negativo/i })).not.toBeInTheDocument();
  });

  it("clicar em 'Limpar' no rodapé do popover volta o filtro ao default", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();

    // aplica sentiment
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    await user.click(await screen.findByRole("button", { name: /^Negativo/i }));

    // reabre — agora deve ter um botão "Limpar" no rodapé do popover
    await user.click(screen.getByRole("button", { name: /Sentimento · Negativo/i }));
    const popoverFooter = await screen.findByRole("button", { name: /^Limpar$/i });
    await user.click(popoverFooter);

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sentiment: "all" }),
    );
  });
});
