import { describe, expect, it } from "vitest";
import { buildMessagePreview, PREVIEW_MAX_LENGTH } from "@/lib/whatsapp/message-preview";

describe("buildMessagePreview", () => {
  it("retorna o texto limpo quando cabe no limite", () => {
    expect(buildMessagePreview({ content: "Oi, tudo bem?" })).toBe("Oi, tudo bem?");
  });

  it("remove HTML do TipTap e colapsa espaços", () => {
    expect(buildMessagePreview({ content: "<p>Olá!</p><p>Segue   o\n\norçamento</p>" })).toBe(
      "Olá! Segue o orçamento"
    );
  });

  it("trunca em 140 chars com reticências", () => {
    const long = "a".repeat(300);
    const preview = buildMessagePreview({ content: long });
    expect(preview).toHaveLength(PREVIEW_MAX_LENGTH);
    expect(preview!.endsWith("…")).toBe(true);
  });

  it("usa rótulo de mídia quando não há texto", () => {
    expect(buildMessagePreview({ content: "", messageType: "image" })).toBe("[Imagem]");
    expect(buildMessagePreview({ content: null, messageType: "sticker" })).toBe("[Imagem]");
    expect(buildMessagePreview({ content: "", messageType: "ptt" })).toBe("[Áudio]");
    expect(buildMessagePreview({ content: "", messageType: "video" })).toBe("[Vídeo]");
    expect(buildMessagePreview({ content: "", messageType: "document" })).toBe("[Documento]");
  });

  it("prefere o texto ao rótulo quando ambos existem", () => {
    expect(buildMessagePreview({ content: "áudio importante", messageType: "audio" })).toBe(
      "áudio importante"
    );
  });

  it("cai em [Mídia] com media_url e tipo desconhecido", () => {
    expect(
      buildMessagePreview({ content: "", messageType: "weird", mediaUrl: "https://x/y.bin" })
    ).toBe("[Mídia]");
  });

  it("retorna null quando não há nada exibível", () => {
    expect(buildMessagePreview({ content: "" })).toBeNull();
    expect(buildMessagePreview({ content: "   ", messageType: null })).toBeNull();
  });
});
