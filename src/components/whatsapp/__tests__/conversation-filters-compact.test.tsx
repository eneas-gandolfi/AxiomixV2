/**
 * @vitest-environment jsdom
 *
 * Testa o componente ConversationFiltersCompact — chip-trigger com popover.
 *   - chips fecham/abrem
 *   - selecionar opção dispara onFiltersChange com valor certo
 *   - default period é "all"
 *   - chip ativo mostra label do valor selecionado
 *   - busca dispara onFiltersChange
 *   - click outside fecha popover
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  it("renderiza os 4 chips de filtro com labels base", () => {
    renderWithMock();
    expect(screen.getByRole("button", { name: /Sentimento/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intenção/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Período/i })).toBeInTheDocument();
  });

  it("default period é 'all' (chip não fica em estado ativo)", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Período/i }));
    // Popover abre — "Todas" deve estar marcada como ativa
    const todasItem = await screen.findByRole("button", { name: /^Todas/i });
    expect(todasItem).toHaveTextContent("Todas");
    expect(todasItem).toHaveTextContent("✓");
    expect(onFiltersChange).not.toHaveBeenCalled();
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

  it("'Limpar filtros' só aparece quando há algum filtro ativo", async () => {
    const { onFiltersChange } = renderWithMock();
    const user = userEvent.setup();

    // sem filtro ativo — botão "Limpar filtros" não existe
    expect(screen.queryByRole("button", { name: /^Limpar filtros$/i })).not.toBeInTheDocument();

    // aplica um filtro
    await user.click(screen.getByRole("button", { name: /Sentimento/i }));
    await user.click(await screen.findByRole("button", { name: /^Negativo/i }));

    // agora aparece
    expect(screen.getByRole("button", { name: /^Limpar filtros$/i })).toBeInTheDocument();

    // clica em Limpar filtros — volta tudo pro default
    await user.click(screen.getByRole("button", { name: /^Limpar filtros$/i }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      sentiment: "all",
      intent: "all",
      status: "all",
      agent: "all",
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
