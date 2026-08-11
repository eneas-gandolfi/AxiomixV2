import { describe, expect, it } from "vitest";
import { resolveSettingsIntegrationFlags } from "@/components/settings/settings-status";

describe("resolveSettingsIntegrationFlags", () => {
  it("mantém o WhatsApp pendente quando a Evolution API não tem vendor conectado", () => {
    expect(
      resolveSettingsIntegrationFlags([
        { type: "evo_crm", is_active: true },
        {
          type: "evolution_api",
          is_active: true,
          config: {
            vendors: [{ instanceName: "axiomix-whatsapp", status: "pending" }],
          },
        },
      ])
    ).toMatchObject({
      activeIntegrations: 2,
      evoCrmActive: true,
      evolutionApiActive: false,
    });
  });

  it("considera o WhatsApp pronto quando há vendor conectado", () => {
    expect(
      resolveSettingsIntegrationFlags([
        { type: "evo_crm", is_active: true },
        {
          type: "evolution_api",
          is_active: true,
          config: {
            vendors: [{ instanceName: "axiomix-whatsapp", status: "connected" }],
          },
        },
      ])
    ).toMatchObject({
      activeIntegrations: 2,
      evoCrmActive: true,
      evolutionApiActive: true,
    });
  });
});
