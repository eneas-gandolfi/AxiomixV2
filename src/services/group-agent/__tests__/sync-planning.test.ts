import { describe, expect, it } from "vitest";
import { resolveGroupSyncInstance } from "@/services/group-agent/sync-planning";

describe("resolveGroupSyncInstance", () => {
  it("bloqueia a sincronização quando a integração tem vendor sem WhatsApp conectado", () => {
    expect(
      resolveGroupSyncInstance({
        hasStoredIntegration: true,
        fallbackInstanceName: "axiomix-default",
        vendors: [{ id: "1", vendorName: "Gestor", instanceName: "axiomix-whatsapp", status: "pending" }],
      })
    ).toEqual({
      ok: false,
      status: 409,
      code: "WHATSAPP_NOT_CONNECTED",
      error: "Conecte o WhatsApp pela Evolution API antes de sincronizar grupos.",
    });
  });

  it("usa a instância conectada para buscar grupos", () => {
    expect(
      resolveGroupSyncInstance({
        hasStoredIntegration: true,
        fallbackInstanceName: "axiomix-default",
        vendors: [{ id: "1", vendorName: "Gestor", instanceName: "axiomix-whatsapp", status: "connected" }],
      })
    ).toEqual({
      ok: true,
      instanceName: "axiomix-whatsapp",
    });
  });
});
