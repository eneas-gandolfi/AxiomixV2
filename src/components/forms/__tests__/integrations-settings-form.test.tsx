/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntegrationsSettingsForm } from "@/components/forms/integrations-settings-form";

vi.mock("@/components/settings/openrouter-model-settings", () => ({
  OpenRouterModelSettings: () => <section aria-label="Modelo de IA">OpenRouter</section>,
}));

describe("IntegrationsSettingsForm", () => {
  it("apresenta WhatsApp como conexão principal e Evo CRM como dados comerciais opcionais", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/integrations") {
          return Response.json({
            items: [
              {
                type: "evo_crm",
                isActive: true,
                testStatus: "ok",
                lastTestedAt: "2026-08-11T12:00:00.000Z",
                config: { baseUrl: "https://api.getlead.capital" },
              },
              {
                type: "evolution_api",
                isActive: true,
                testStatus: "ok",
                lastTestedAt: "2026-08-11T12:00:00.000Z",
                config: {},
              },
            ],
          });
        }

        if (url === "/api/integrations/evolution-api/vendors") {
          return Response.json({
            managerPhone: "",
            vendors: [{ id: "1", vendorName: "Gestor", instanceName: "axiomix-whatsapp", status: "pending" }],
          });
        }

        return Response.json({});
      })
    );

    render(<IntegrationsSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conexão WhatsApp" })).toBeInTheDocument();
    });

    expect(screen.getByText("Fluxo principal para capturar grupos, mensagens e respostas da IA.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dados comerciais" })).toBeInTheDocument();
    expect(screen.getByText("Opcional para enriquecer grupos com contatos, oportunidades e histórico do CRM.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Evolution API" })).not.toBeInTheDocument();
  });

  it("orienta quando o QR Code retornado não pode ser exibido", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/integrations") {
        return Response.json({ items: [] });
      }

      if (url === "/api/integrations/evolution-api/vendors" && init?.method === "POST") {
        return Response.json({
          managerPhone: "5511999999999",
          qrCodeDataUrl: "data:image/png;base64,invalid",
          vendor: {
            id: "1",
            vendorName: "Gestor",
            instanceName: "axiomix-whatsapp",
            status: "pending",
          },
        });
      }

      if (url === "/api/integrations/evolution-api/vendors") {
        return Response.json({ managerPhone: "", vendors: [] });
      }

      return Response.json({});
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<IntegrationsSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conexão WhatsApp" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Conectar WhatsApp" }));
    await user.type(screen.getByLabelText("WhatsApp do gestor"), "5511999999999");
    await user.type(screen.getByLabelText("Nome da conexão"), "Gestor");
    await user.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    const qr = await screen.findByAltText("QR Code para conectar WhatsApp");
    fireEvent.error(qr);

    expect(screen.getByText("Não foi possível exibir este QR Code. Gere um novo código e tente novamente.")).toBeInTheDocument();
  });

  it("exibe código de pareamento quando a conexão retorna alternativa ao QR", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/integrations") {
        return Response.json({ items: [] });
      }

      if (url === "/api/integrations/evolution-api/vendors" && init?.method === "POST") {
        return Response.json({
          managerPhone: "5511999999999",
          qrCodeDataUrl: "data:image/png;base64,valid",
          pairingCode: "ABCD-1234",
          vendor: {
            id: "1",
            vendorName: "Gestor",
            instanceName: "axiomix-whatsapp",
            status: "pending",
          },
        });
      }

      if (url === "/api/integrations/evolution-api/vendors") {
        return Response.json({ managerPhone: "", vendors: [] });
      }

      return Response.json({});
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<IntegrationsSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conexão WhatsApp" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Conectar WhatsApp" }));
    await user.type(screen.getByLabelText("WhatsApp do gestor"), "5511999999999");
    await user.type(screen.getByLabelText("Nome da conexão"), "Gestor");
    await user.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(await screen.findByText("ABCD-1234")).toBeInTheDocument();
    expect(screen.getByText("Conectar com código")).toBeInTheDocument();
  });

  it("prioriza o código de pareamento quando a imagem do QR falha", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/integrations") {
          return Response.json({ items: [] });
        }

        if (url === "/api/integrations/evolution-api/vendors" && init?.method === "POST") {
          return Response.json({
            managerPhone: "5511999999999",
            qrCodeDataUrl: "data:image/png;base64,invalid",
            pairingCode: "ABCD-1234",
            vendor: {
              id: "1",
              vendorName: "Gestor",
              instanceName: "axiomix-whatsapp",
              status: "pending",
            },
          });
        }

        if (url === "/api/integrations/evolution-api/vendors") {
          return Response.json({ managerPhone: "", vendors: [] });
        }

        return Response.json({});
      })
    );

    render(<IntegrationsSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conexão WhatsApp" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Conectar WhatsApp" }));
    await user.type(screen.getByLabelText("WhatsApp do gestor"), "5511999999999");
    await user.type(screen.getByLabelText("Nome da conexão"), "Gestor");
    await user.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    const qr = await screen.findByAltText("QR Code para conectar WhatsApp");
    fireEvent.error(qr);

    expect(screen.queryByAltText("QR Code para conectar WhatsApp")).not.toBeInTheDocument();
    expect(screen.getByText("Não foi possível exibir este QR Code. Use o código abaixo para conectar este WhatsApp.")).toBeInTheDocument();
    expect(screen.getByText("ABCD-1234")).toBeInTheDocument();
  });

  it("exibe código de pareamento mesmo quando a resposta não traz QR", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/integrations") {
          return Response.json({ items: [] });
        }

        if (url === "/api/integrations/evolution-api/vendors" && init?.method === "POST") {
          return Response.json({
            managerPhone: "5511999999999",
            qrCodeDataUrl: null,
            pairingCode: "WXYZ-9876",
            vendor: {
              id: "1",
              vendorName: "Gestor",
              instanceName: "axiomix-whatsapp",
              status: "pending",
            },
          });
        }

        if (url === "/api/integrations/evolution-api/vendors") {
          return Response.json({ managerPhone: "", vendors: [] });
        }

        return Response.json({});
      })
    );

    render(<IntegrationsSettingsForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Conexão WhatsApp" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Conectar WhatsApp" }));
    await user.type(screen.getByLabelText("WhatsApp do gestor"), "5511999999999");
    await user.type(screen.getByLabelText("Nome da conexão"), "Gestor");
    await user.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(await screen.findByText("WXYZ-9876")).toBeInTheDocument();
    expect(screen.queryByAltText("QR Code para conectar WhatsApp")).not.toBeInTheDocument();
  });
});
