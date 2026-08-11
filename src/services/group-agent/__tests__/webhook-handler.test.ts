import { describe, it, expect } from "vitest";
import {
  extractTextContent,
  isMediaMessage,
  extractMediaMimetype,
  isGroupJid,
  detectTrigger,
  resolveGroupMediaContinuationContext,
  shouldProcessGroupMedia,
  resolveTimestamp,
  normalizeEvolutionPayload,
} from "../webhook-handler";

function createSupabaseMaybeSingleMock(results: unknown[]) {
  return {
    from() {
      const chain = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        in: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: results.shift() ?? null }),
      };
      return chain;
    },
  };
}

describe("extractTextContent", () => {
  it("retorna null para message null/undefined", () => {
    expect(extractTextContent(null as unknown as undefined)).toBeNull();
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
    expect(isMediaMessage(null as unknown as undefined)).toBe(false);
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
    expect(extractMediaMimetype(null as unknown as undefined)).toBeNull();
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

describe("shouldProcessGroupMedia", () => {
  it("does not process media for inactive groups", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: false,
        isTrigger: true,
        isAudio: true,
        hasActiveSession: false,
        hasRecentProactive: false,
      })
    ).toBe(false);
  });

  it("does not process non-trigger media in passive radar flow", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: false,
        isAudio: false,
        hasActiveSession: false,
        hasRecentProactive: false,
      })
    ).toBe(false);
  });

  it("processes media when the message explicitly triggers the agent", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: true,
        isAudio: false,
        hasActiveSession: false,
        hasRecentProactive: false,
      })
    ).toBe(true);
  });

  it("processes audio only when it belongs to an active agent conversation", () => {
    expect(
      shouldProcessGroupMedia({
        hasMedia: true,
        isActive: true,
        isTrigger: false,
        isAudio: true,
        hasActiveSession: true,
        hasRecentProactive: false,
      })
    ).toBe(true);
  });
});

describe("resolveGroupMediaContinuationContext", () => {
  it("detects active group agent sessions for media continuation", async () => {
    const supabase = createSupabaseMaybeSingleMock([{ id: "session-1" }, null]);

    const result = await resolveGroupMediaContinuationContext({
      supabase: supabase as never,
      configId: "config-1",
      senderJid: "sender@s.whatsapp.net",
      remoteJid: "120@g.us",
      now: new Date("2026-08-11T15:00:00Z"),
    });

    expect(result).toEqual({
      hasActiveSession: true,
      hasRecentProactive: false,
    });
  });

  it("detects recent proactive responses for media continuation", async () => {
    const supabase = createSupabaseMaybeSingleMock([null, { id: "response-1" }]);

    const result = await resolveGroupMediaContinuationContext({
      supabase: supabase as never,
      configId: "config-1",
      senderJid: "sender@s.whatsapp.net",
      remoteJid: "120@g.us",
      now: new Date("2026-08-11T15:00:00Z"),
    });

    expect(result).toEqual({
      hasActiveSession: false,
      hasRecentProactive: true,
    });
  });
});
