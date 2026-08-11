import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateEvolutionQrCode } from "@/services/integrations/evolution";

const pngQrDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("generateEvolutionQrCode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignora código textual e usa o campo base64 quando ele contém uma imagem", async () => {
    const nonImageBase64 = Buffer.from("este valor parece base64, mas nao e uma imagem".repeat(8)).toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: nonImageBase64,
          base64: pngQrDataUrl,
          count: 1,
        })
      )
    );

    await expect(
      generateEvolutionQrCode({
        credentials: { baseUrl: "https://evolution.example", apiKey: "secret" },
        instanceName: "gestor-1",
      })
    ).resolves.toMatchObject({
      source: "create_instance",
      qrCodeDataUrl: pngQrDataUrl,
    });
  });

  it("ignora URL de webhook e usa somente imagem como QR Code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          webhook: {
            url: "https://axiomix.example/api/webhooks/evolution/group?token=secret",
          },
          code: "2@codigo-textual",
          base64: pngQrDataUrl,
          count: 1,
        })
      )
    );

    await expect(
      generateEvolutionQrCode({
        credentials: { baseUrl: "https://evolution.example", apiKey: "secret" },
        instanceName: "gestor-1",
      })
    ).resolves.toMatchObject({
      source: "create_instance",
      qrCodeDataUrl: pngQrDataUrl,
    });
  });

  it("busca código de pareamento quando um telefone é informado", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          code: "2@codigo-textual",
          base64: pngQrDataUrl,
          count: 1,
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          pairingCode: "ABCD-1234",
          code: "2@codigo-textual",
          base64: pngQrDataUrl,
          count: 1,
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateEvolutionQrCode({
        credentials: { baseUrl: "https://evolution.example", apiKey: "secret" },
        instanceName: "gestor-1",
        phoneNumber: "55 (11) 99999-9999",
      })
    ).resolves.toMatchObject({
      source: "connect_instance_pairing",
      qrCodeDataUrl: pngQrDataUrl,
      pairingCode: "ABCD-1234",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://evolution.example/instance/connect/gestor-1?number=5511999999999",
      expect.any(Object)
    );
  });
});
