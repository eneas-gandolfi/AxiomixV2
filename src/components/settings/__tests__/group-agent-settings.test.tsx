/**
 * @vitest-environment jsdom
 */

import type { FormEvent } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupAgentSettings } from "@/components/settings/group-agent-settings";

type Config = {
  id: string;
  group_name: string;
  is_active?: boolean;
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
  activity?: {
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    messages24h: number;
    uniqueSenders24h: number;
  };
};

function makeConfig(config: Config) {
  return {
    id: config.id,
    company_id: "company-1",
    group_jid: `${config.id}@g.us`,
    group_name: config.group_name,
    is_active: config.is_active ?? false,
    trigger_keywords: ["@axiomix"],
    agent_name: "Axiomix IA",
    agent_tone: "profissional",
    feed_to_rag: false,
    rag_min_message_length: 50,
    max_responses_per_hour: 20,
    cooldown_seconds: 10,
    evolution_instance_name: "gestor",
    proactive_summary: false,
    proactive_summary_hour: 9,
    proactive_sales_alert: false,
    is_hidden: config.is_hidden ?? false,
    created_at: config.created_at,
    updated_at: config.updated_at,
    stats: {
      totalMessages: 0,
      totalResponses: 0,
    },
    activity: config.activity ?? {
      lastMessageAt: null,
      lastMessagePreview: null,
      messages24h: 0,
      uniqueSenders24h: 0,
    },
  };
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GroupAgentSettings", () => {
  it("mantém o usuário na tela e mostra carregamento ao sincronizar grupos", async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    let resolveSync: (response: Response) => void = () => undefined;

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/settings/group-agent" && !init?.method) {
        return Promise.resolve(jsonResponse({ configs: [makeConfig({
          id: "grupo-1",
          group_name: "Grupo inicial",
          created_at: "2026-08-10T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        })] }));
      }

      if (url === "/api/settings/group-agent/sync" && init?.method === "POST") {
        return new Promise<Response>((resolve) => {
          resolveSync = resolve;
        });
      }

      return Promise.reject(new Error(`fetch inesperado: ${url}`));
    });

    render(
      <form onSubmit={onSubmit}>
        <GroupAgentSettings companyId="company-1" />
      </form>
    );

    await screen.findByText("Grupo inicial");

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Sincronizar Grupos" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sincronizando..." })).toBeDisabled();
    expect(screen.getByRole("progressbar", { name: "Progresso da sincronização" })).toHaveAttribute(
      "aria-valuenow",
      "8"
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(
      Number(screen.getByRole("progressbar", { name: "Progresso da sincronização" }).getAttribute("aria-valuenow"))
    ).toBeGreaterThan(8);

    await act(async () => {
      resolveSync(jsonResponse({ ok: true, created: 0, updated: 1, hidden: 0, total: 1 }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("apresenta os grupos visíveis do mais recente para o mais antigo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      configs: [
        makeConfig({
          id: "grupo-cadastro-recente-sem-mensagem",
          group_name: "Grupo cadastro recente sem mensagem",
          is_active: true,
          created_at: "2026-08-11T10:00:00.000Z",
          updated_at: "2026-08-11T10:00:00.000Z",
        }),
        makeConfig({
          id: "grupo-cadastro-antigo-mensagem-recente",
          group_name: "Grupo cadastro antigo mensagem recente",
          is_active: false,
          created_at: "2026-08-08T10:00:00.000Z",
          updated_at: "2026-08-08T10:00:00.000Z",
          activity: {
            lastMessageAt: "2026-08-12T12:00:00.000Z",
            lastMessagePreview: "Perguntaram sobre prazo e valores.",
            messages24h: 8,
            uniqueSenders24h: 3,
          },
        }),
        makeConfig({
          id: "grupo-intermediario",
          group_name: "Grupo intermediário",
          is_active: false,
          created_at: "2026-08-09T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        }),
      ],
    }));

    render(<GroupAgentSettings companyId="company-1" />);

    await screen.findAllByTestId("group-agent-card-name");

    const names = screen
      .getAllByTestId("group-agent-card-name")
      .map((element) => element.textContent);

    expect(names).toEqual([
      "Grupo cadastro antigo mensagem recente",
      "Grupo cadastro recente sem mensagem",
      "Grupo intermediário",
    ]);
  });

  it("mostra um resumo compacto de assuntos e engajamento dos grupos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      configs: [
        makeConfig({
          id: "grupo-engajado",
          group_name: "Grupo engajado",
          created_at: "2026-08-08T10:00:00.000Z",
          updated_at: "2026-08-08T10:00:00.000Z",
          activity: {
            lastMessageAt: "2026-08-12T12:00:00.000Z",
            lastMessagePreview: "Clientes perguntando sobre preço e desconto.",
            messages24h: 18,
            uniqueSenders24h: 7,
          },
        }),
      ],
    }));

    render(<GroupAgentSettings companyId="company-1" />);

    expect(await screen.findByText("Assuntos e engajamento")).toBeInTheDocument();
    expect(screen.getAllByText("Grupo engajado").length).toBeGreaterThan(0);
    expect(screen.getByText("18 msgs")).toBeInTheDocument();
    expect(screen.getByText("7 pessoas")).toBeInTheDocument();
    expect(screen.getByText("Clientes perguntando sobre preço e desconto.")).toBeInTheDocument();
  });
});
