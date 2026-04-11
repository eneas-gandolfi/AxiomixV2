import { describe, it, expect } from "vitest";
import {
  extractTextContent,
  isMediaMessage,
  extractMediaMimetype,
  isGroupJid,
  detectTrigger,
  resolveTimestamp,
  normalizeEvolutionPayload,
} from "../webhook-handler";

describe("extractTextContent", () => {
  it("retorna null para message null", () => {
    expect(extractTextContent(null)).toBeNull();
    expect(extractTextContent(undefined)).toBeNull();
  });

  it("extrai conversation text", () => {
    expect(extractTextContent({ conversation: "Olá!" })).toBe("Olá!");
  });

  it("extrai extendedTextMessage", () => {
    expect(
      extractTextContent({ extendedTextMessage: { text: "Mensagem longa" } })
    ).toBe("Mensagem longa");
  });

  it("extrai caption de imagem", () => {
    expect(
      extractTextContent({ imageMessage: { caption: "Foto do produto" } })
    ).toBe("Foto do produto");
  });

  it("extrai caption de documento", () => {
    expect(
      extractTextContent({ documentMessage: { caption: "Manual PDF" } })
    ).toBe("Manual PDF");
  });

  it("extrai caption de documentWithCaption", () => {
    expect(
      extractTextContent({
        documentWithCaptionMessage: {
          message: { documentMessage: { caption: "Relatório" } },
        },
      })
    ).toBe("Relatório");
  });

  it("prioriza conversation sobre extendedText", () => {
    expect(
      extractTextContent({
        conversation: "Direto",
        extendedTextMessage: { text: "Estendido" },
      })
    ).toBe("Direto");
  });
});

describe("isMediaMessage", () => {
  it("retorna false para null", () => {
    expect(isMediaMessage(null)).toBe(false);
  });

  it("detecta imageMessage", () => {
    expect(isMediaMessage({ imageMessage: { mimetype: "image/jpeg" } })).toBe(true);
  });

  it("detecta audioMessage", () => {
    expect(isMediaMessage({ audioMessage: { mimetype: "audio/ogg" } })).toBe(true);
  });

  it("detecta documentMessage", () => {
    expect(isMediaMessage({ documentMessage: { mimetype: "application/pdf" } })).toBe(true);
  });

  it("detecta stickerMessage", () => {
    expect(isMediaMessage({ stickerMessage: {} })).toBe(true);
  });

  it("retorna false para texto puro", () => {
    expect(isMediaMessage({ conversation: "texto" })).toBe(false);
  });
});

describe("extractMediaMimetype", () => {
  it("retorna null para null", () => {
    expect(extractMediaMimetype(null)).toBeNull();
  });

  it("extrai de imageMessage", () => {
    expect(extractMediaMimetype({ imageMessage: { mimetype: "image/png" } })).toBe("image/png");
  });

  it("extrai de audioMessage", () => {
    expect(extractMediaMimetype({ audioMessage: { mimetype: "audio/ogg" } })).toBe("audio/ogg");
  });
});

describe("isGroupJid", () => {
  it("identifica grupo", () => {
    expect(isGroupJid("120363123456789@g.us")).toBe(true);
  });

  it("rejeita contato individual", () => {
    expect(isGroupJid("5511999999999@s.whatsapp.net")).toBe(false);
  });
});

describe("detectTrigger", () => {
  const keywords = ["axiomix", "ajuda"];

  it("detecta trigger no início", () => {
    expect(detectTrigger("axiomix me ajude", keywords)).toBe(true);
  });

  it("detecta trigger no meio com espaço", () => {
    expect(detectTrigger("por favor axiomix", keywords)).toBe(true);
  });

  it("detecta trigger com nova linha", () => {
    expect(detectTrigger("oi\najuda aqui", keywords)).toBe(true);
  });

  it("não detecta trigger ausente", () => {
    expect(detectTrigger("mensagem normal sem trigger", keywords)).toBe(false);
  });

  it("é case-insensitive", () => {
    expect(detectTrigger("AXIOMIX help", keywords)).toBe(true);
  });
});

describe("resolveTimestamp", () => {
  it("retorna ISO now para undefined", () => {
    const result = resolveTimestamp(undefined);
    expect(new Date(result).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("converte timestamp em segundos", () => {
    const result = resolveTimestamp(1700000000);
    expect(result).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("converte timestamp em milissegundos", () => {
    const ms = 1700000000000;
    const result = resolveTimestamp(ms);
    expect(result).toBe(new Date(ms).toISOString());
  });

  it("converte string numérica", () => {
    const result = resolveTimestamp("1700000000");
    expect(result).toBe(new Date(1700000000 * 1000).toISOString());
  });
});

describe("normalizeEvolutionPayload", () => {
  it("converte data array para objeto", () => {
    const raw = { event: "messages.upsert", data: [{ key: { id: "1" } }] };
    const result = normalizeEvolutionPayload(raw);
    expect(result.data).toEqual({ key: { id: "1" } });
  });

  it("extrai instanceName de objeto", () => {
    const raw = {
      event: "messages.upsert",
      instance: { instanceName: "axiomix-prod" },
      data: {},
    };
    const result = normalizeEvolutionPayload(raw);
    expect(result.instance).toBe("axiomix-prod");
  });

  it("mantém instance string intacta", () => {
    const raw = { event: "messages.upsert", instance: "axiomix-prod", data: {} };
    const result = normalizeEvolutionPayload(raw);
    expect(result.instance).toBe("axiomix-prod");
  });

  it("lida com data array vazio", () => {
    const raw = { event: "messages.upsert", data: [] };
    const result = normalizeEvolutionPayload(raw);
    expect(result.data).toEqual({});
  });
});
