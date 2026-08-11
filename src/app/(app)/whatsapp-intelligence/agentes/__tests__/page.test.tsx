/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentsPage from "../page";

vi.mock("@/lib/contexts/company-id-context", () => ({
  useCompanyId: () => "18b641e2-7c73-4fa7-9831-cc7c0eb967b6",
}));

describe("AgentsPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/whatsapp/agents?")) {
        return Response.json(
          {
            code: "EVO_AUTH_MISSING",
            error:
              "Agentes IA dependem das credenciais do Evo Auth Service. Configure EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD no ambiente.",
          },
          { status: 503 }
        );
      }

      if (url === "/api/whatsapp/team") {
        return Response.json({ inboxes: [] });
      }

      return Response.json({}, { status: 404 });
    }) as typeof fetch;
  });

  it("shows an actionable setup state when Evo Auth is missing instead of a dead error page", async () => {
    render(<AgentsPage />);

    expect(
      await screen.findByText("Agentes IA do Evo CRM indisponíveis")
    ).toBeInTheDocument();
    expect(screen.getByText(/Configure EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configurar WhatsApp e IA" })).toHaveAttribute(
      "href",
      "/settings?tab=group-agent"
    );
    expect(screen.queryByText("Não foi possível carregar os agentes. Tente novamente.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/whatsapp/agents?companyId=18b641e2-7c73-4fa7-9831-cc7c0eb967b6"
      );
    });
  });
});
