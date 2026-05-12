/**
 * @vitest-environment jsdom
 *
 * Testa o componente ConversationsTable — lista densa de rows 60px.
 *   - renderiza nome do contato
 *   - mostra empty state quando lista vazia
 *   - mostra badge "aguardando" quando sentiment=negativo + >30min sem resposta
 *   - mostra chip de intent quando presente
 *   - mostra avatar do vendedor (iniciais) quando assigned_to bate com agents
 *   - mostra "resolvida" quando status=closed
 *   - toggle selection chama onToggleSelection
 *   - click no contato (sem selectionMode) navega via router.push
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationsTable } from "../conversations-table";

// Mock do useRouter (Next.js)
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
});

const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

const baseConversation = {
  id: "c-1",
  external_id: "ext-1",
  contact_name: "Roberta Mendes",
  contact_avatar_url: null,
  remote_jid: "5511987654321@s.whatsapp.net",
  status: "open",
  last_message_at: minutesAgo(5),
  assigned_to: null,
  sentiment: null,
  intent: null,
};

describe("ConversationsTable — render básico", () => {
  it("renderiza empty state quando lista é vazia", () => {
    render(
      <ConversationsTable
        conversations={[]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/Tudo respondido por aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma conversa encontrada/i)).toBeInTheDocument();
  });

  it("renderiza o nome do contato", () => {
    render(
      <ConversationsTable
        conversations={[baseConversation]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText("Roberta Mendes")).toBeInTheDocument();
  });

  it("formata telefone quando contact_name é null", () => {
    render(
      <ConversationsTable
        conversations={[{ ...baseConversation, contact_name: null }]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/\(11\) 98765-4321/)).toBeInTheDocument();
  });

  it("mostra chip de intent quando presente", () => {
    render(
      <ConversationsTable
        conversations={[{ ...baseConversation, intent: "cancelamento" }]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText("cancelamento")).toBeInTheDocument();
  });

  it("mostra '· resolvida' quando status=closed", () => {
    render(
      <ConversationsTable
        conversations={[{ ...baseConversation, status: "closed" }]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/resolvida/i)).toBeInTheDocument();
  });
});

describe("ConversationsTable — estado crítico (aguardando)", () => {
  it("mostra badge 'aguardando' quando sentiment=negativo e >30min sem resposta", () => {
    render(
      <ConversationsTable
        conversations={[
          {
            ...baseConversation,
            sentiment: "negativo",
            last_message_at: minutesAgo(47),
          },
        ]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
  });

  it("NÃO mostra badge 'aguardando' quando sentiment=negativo mas <30min", () => {
    render(
      <ConversationsTable
        conversations={[
          {
            ...baseConversation,
            sentiment: "negativo",
            last_message_at: minutesAgo(10),
          },
        ]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.queryByText(/aguardando/i)).not.toBeInTheDocument();
  });

  it("NÃO mostra badge 'aguardando' quando sentiment=positivo independente do tempo", () => {
    render(
      <ConversationsTable
        conversations={[
          {
            ...baseConversation,
            sentiment: "positivo",
            last_message_at: minutesAgo(120),
          },
        ]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.queryByText(/aguardando/i)).not.toBeInTheDocument();
  });

  it("NÃO mostra badge 'aguardando' quando status=closed (resolvida) mesmo com negativo + tempo", () => {
    render(
      <ConversationsTable
        conversations={[
          {
            ...baseConversation,
            sentiment: "negativo",
            status: "closed",
            last_message_at: minutesAgo(120),
          },
        ]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.queryByText(/aguardando/i)).not.toBeInTheDocument();
  });
});

describe("ConversationsTable — vendedor responsável", () => {
  it("mostra iniciais do vendedor quando assigned_to bate com agent", () => {
    render(
      <ConversationsTable
        conversations={[{ ...baseConversation, assigned_to: "ag-1" }]}
        agents={[{ id: "ag-1", name: "Marina Silva" }]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    // Iniciais "MS" — title tem o nome completo
    const vendorAvatar = screen.getByTitle("Marina Silva");
    expect(vendorAvatar).toBeInTheDocument();
    expect(vendorAvatar).toHaveTextContent("MS");
  });

  it("NÃO mostra avatar do vendedor quando assigned_to é null", () => {
    render(
      <ConversationsTable
        conversations={[{ ...baseConversation, assigned_to: null }]}
        agents={[{ id: "ag-1", name: "Marina Silva" }]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    expect(screen.queryByTitle("Marina Silva")).not.toBeInTheDocument();
  });

});

describe("ConversationsTable — interações click/seleção", () => {
  it("click numa row (sem selectionMode) chama router.push pra detalhe da conversa", async () => {
    const user = userEvent.setup();
    render(
      <ConversationsTable
        conversations={[baseConversation]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Roberta Mendes"));
    expect(pushMock).toHaveBeenCalledWith("/whatsapp-intelligence/conversas/c-1");
  });

  it("click numa row em selectionMode chama onToggleSelection (não navega)", async () => {
    const onToggleSelection = vi.fn();
    const user = userEvent.setup();
    render(
      <ConversationsTable
        conversations={[baseConversation]}
        selectionMode={true}
        selectedIds={new Set()}
        onToggleSelection={onToggleSelection}
        onSelectAll={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Roberta Mendes"));
    expect(onToggleSelection).toHaveBeenCalledWith("c-1");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("checkbox marcado quando selectedIds contém o id", () => {
    render(
      <ConversationsTable
        conversations={[baseConversation]}
        selectionMode={true}
        selectedIds={new Set(["c-1"])}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /Selecionar conversa com Roberta Mendes/i,
    });
    expect(checkbox).toBeChecked();
  });

  it("toggle no checkbox dispara onToggleSelection sem disparar router.push", async () => {
    const onToggleSelection = vi.fn();
    const user = userEvent.setup();
    render(
      <ConversationsTable
        conversations={[baseConversation]}
        selectionMode={true}
        selectedIds={new Set()}
        onToggleSelection={onToggleSelection}
        onSelectAll={vi.fn()}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /Selecionar conversa com Roberta Mendes/i,
    });
    await user.click(checkbox);

    expect(onToggleSelection).toHaveBeenCalledWith("c-1");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("ConversationsTable — múltiplas rows", () => {
  it("renderiza várias conversas na ordem fornecida", () => {
    render(
      <ConversationsTable
        conversations={[
          { ...baseConversation, id: "c-1", contact_name: "Roberta" },
          { ...baseConversation, id: "c-2", contact_name: "Eduardo" },
          { ...baseConversation, id: "c-3", contact_name: "Sandra" },
        ]}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelection={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );

    const names = screen.getAllByText(/Roberta|Eduardo|Sandra/);
    expect(names[0]).toHaveTextContent("Roberta");
    expect(names[1]).toHaveTextContent("Eduardo");
    expect(names[2]).toHaveTextContent("Sandra");
  });
});
