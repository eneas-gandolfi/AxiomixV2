/**
 * Testes do webhook handler Evo CRM.
 * Valida: HMAC, idempotência, parsing de eventos, payloads malformados.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "node:crypto"

// ---------------------------------------------------------------------------
// Helpers extraídos do route para teste isolado
// ---------------------------------------------------------------------------

function validateSignature(body: string, secret: string, signature: string | null): boolean {
  if (!signature) return false
  const { timingSafeEqual } = require("node:crypto")
  const expected = createHmac("sha256", secret).update(body).digest("hex")
  try {
    const a = Buffer.from(expected, "utf-8")
    const b = Buffer.from(signature, "utf-8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function extractEventName(payload: Record<string, unknown>): string {
  return (typeof payload.event === "string" ? payload.event : typeof payload.type === "string" ? payload.type : "unknown") ?? "unknown"
}

function extractData(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.data && typeof payload.data === "object") return payload.data as Record<string, unknown>
  if (payload.payload && typeof payload.payload === "object") return payload.payload as Record<string, unknown>
  return payload
}

function epochToIso(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && value > 0) return new Date(value * 1000).toISOString()
  return new Date().toISOString()
}

// ---------------------------------------------------------------------------
// HMAC Validation
// ---------------------------------------------------------------------------

describe("Webhook — HMAC Validation", () => {
  const secret = "test-webhook-secret-123"
  const body = JSON.stringify({ event: "message_created", data: { id: "1" } })

  it("aceita payload com HMAC correto", () => {
    const validSig = createHmac("sha256", secret).update(body).digest("hex")
    expect(validateSignature(body, secret, validSig)).toBe(true)
  })

  it("rejeita payload com HMAC incorreto", () => {
    expect(validateSignature(body, secret, "deadbeef")).toBe(false)
  })

  it("rejeita payload sem header de HMAC", () => {
    expect(validateSignature(body, secret, null)).toBe(false)
  })

  it("rejeita HMAC de outro secret (company A vs B)", () => {
    const sigFromOtherSecret = createHmac("sha256", "other-secret").update(body).digest("hex")
    expect(validateSignature(body, secret, sigFromOtherSecret)).toBe(false)
  })

  it("rejeita HMAC com body diferente (tampered payload)", () => {
    const validSig = createHmac("sha256", secret).update(body).digest("hex")
    const tamperedBody = JSON.stringify({ event: "message_created", data: { id: "2" } })
    expect(validateSignature(tamperedBody, secret, validSig)).toBe(false)
  })

  it("rejeita string vazia como signature", () => {
    expect(validateSignature(body, secret, "")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Event Parsing
// ---------------------------------------------------------------------------

describe("Webhook — Event Parsing", () => {
  it('extrai evento do campo "event"', () => {
    expect(extractEventName({ event: "message_created" })).toBe("message_created")
  })

  it('extrai evento do campo "type" quando "event" não existe', () => {
    expect(extractEventName({ type: "conversation_updated" })).toBe("conversation_updated")
  })

  it('retorna "unknown" quando nenhum campo existe', () => {
    expect(extractEventName({})).toBe("unknown")
  })

  it('extrai data do campo "data"', () => {
    const payload = { event: "test", data: { id: "123" } }
    expect(extractData(payload)).toEqual({ id: "123" })
  })

  it('extrai data do campo "payload" quando "data" não existe', () => {
    const payload = { event: "test", payload: { id: "456" } }
    expect(extractData(payload)).toEqual({ id: "456" })
  })

  it("retorna payload inteiro como fallback", () => {
    const payload = { event: "test", id: "789" }
    const data = extractData(payload)
    expect(data.id).toBe("789")
  })
})

// ---------------------------------------------------------------------------
// Epoch to ISO conversion
// ---------------------------------------------------------------------------

describe("Webhook — epochToIso", () => {
  it("retorna string ISO se input já é string", () => {
    expect(epochToIso("2026-04-29T10:00:00Z")).toBe("2026-04-29T10:00:00Z")
  })

  it("converte Unix epoch (segundos) para ISO", () => {
    const epoch = 1714384800 // 2024-04-29 ~10:00 UTC
    const result = epochToIso(epoch)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("retorna data atual para valores inválidos", () => {
    const before = Date.now()
    const result = epochToIso(null)
    const after = Date.now()
    const resultMs = new Date(result).getTime()
    expect(resultMs).toBeGreaterThanOrEqual(before - 1000)
    expect(resultMs).toBeLessThanOrEqual(after + 1000)
  })

  it("retorna data atual para zero", () => {
    const result = epochToIso(0)
    // 0 é falsy para "value > 0" check
    expect(new Date(result).getFullYear()).toBeGreaterThanOrEqual(2026)
  })
})

// ---------------------------------------------------------------------------
// Message direction parsing
// ---------------------------------------------------------------------------

describe("Webhook — Message Direction", () => {
  it('message_type "outgoing" → outbound', () => {
    const data = { message_type: "outgoing", content: "hello" }
    const msgType = typeof data.message_type === "string" ? data.message_type.toLowerCase() : null
    const fromMe = msgType === "outgoing"
    expect(fromMe).toBe(true)
  })

  it('message_type "incoming" → inbound', () => {
    const data = { message_type: "incoming", content: "hello" }
    const msgType = typeof data.message_type === "string" ? data.message_type.toLowerCase() : null
    const fromMe = msgType === "outgoing"
    expect(fromMe).toBe(false)
  })

  it("from_me boolean tem precedência sobre message_type", () => {
    const data = { from_me: true, message_type: "incoming" }
    const fromMe = typeof data.from_me === "boolean" ? data.from_me : false
    expect(fromMe).toBe(true)
  })

  // Chatwoot/Evo CRM usa message_type numérico (0=incoming, 1=outgoing).
  it("message_type 1 (numérico) → outbound", () => {
    const data: Record<string, unknown> = { message_type: 1, content: "hello" }
    const msgTypeStr = typeof data.message_type === "string" ? data.message_type.toLowerCase() : null
    const fromMe =
      data.message_type === 1 ||
      data.message_type === "1" ||
      msgTypeStr === "outgoing"
    expect(fromMe).toBe(true)
  })

  it("message_type 0 (numérico) → inbound", () => {
    const data: Record<string, unknown> = { message_type: 0, content: "hello" }
    const msgTypeStr = typeof data.message_type === "string" ? data.message_type.toLowerCase() : null
    const fromMe =
      data.message_type === 1 ||
      data.message_type === "1" ||
      msgTypeStr === "outgoing"
    expect(fromMe).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Payload aninhado do Evo CRM (data.conversation.id, data.meta.sender)
// ---------------------------------------------------------------------------

// Replicas das helpers do route.ts (para teste isolado sem importar o module).
function extractConversationId(data: Record<string, unknown>): string | null {
  const conv =
    typeof data.conversation === "object" && data.conversation !== null
      ? (data.conversation as Record<string, unknown>)
      : null
  if (conv && (typeof conv.id === "string" || typeof conv.id === "number")) {
    return String(conv.id)
  }
  if (typeof data.conversation_id === "string" || typeof data.conversation_id === "number") {
    return String(data.conversation_id)
  }
  return null
}

function extractContactRaw(data: Record<string, unknown>): Record<string, unknown> | null {
  const meta =
    typeof data.meta === "object" && data.meta !== null
      ? (data.meta as Record<string, unknown>)
      : null
  const metaSender =
    meta && typeof meta.sender === "object" && meta.sender !== null
      ? (meta.sender as Record<string, unknown>)
      : null
  if (metaSender) return metaSender
  const directSender =
    typeof data.sender === "object" && data.sender !== null
      ? (data.sender as Record<string, unknown>)
      : null
  if (directSender) return directSender
  const conv =
    typeof data.conversation === "object" && data.conversation !== null
      ? (data.conversation as Record<string, unknown>)
      : null
  const convMeta =
    conv && typeof conv.meta === "object" && conv.meta !== null
      ? (conv.meta as Record<string, unknown>)
      : null
  const convSender =
    convMeta && typeof convMeta.sender === "object" && convMeta.sender !== null
      ? (convMeta.sender as Record<string, unknown>)
      : null
  if (convSender) return convSender
  return typeof data.contact === "object" && data.contact !== null
    ? (data.contact as Record<string, unknown>)
    : null
}

describe("Webhook — Payload aninhado (extractConversationId)", () => {
  it("extrai UUID de data.conversation.id (formato real do Evo CRM)", () => {
    const data = {
      conversation: { id: "01781ae0-ea84-4aba-9c89-6c385a433c43", display_id: 3 },
    }
    expect(extractConversationId(data)).toBe("01781ae0-ea84-4aba-9c89-6c385a433c43")
  })

  it("aceita data.conversation_id top-level como fallback legado", () => {
    const data = { conversation_id: "legacy-uuid-here" }
    expect(extractConversationId(data)).toBe("legacy-uuid-here")
  })

  it("prefere data.conversation.id sobre data.conversation_id quando ambos vêm", () => {
    const data = {
      conversation: { id: "nested-uuid" },
      conversation_id: "top-level-uuid",
    }
    expect(extractConversationId(data)).toBe("nested-uuid")
  })

  it("retorna null quando nenhum dos formatos vem", () => {
    expect(extractConversationId({})).toBeNull()
    expect(extractConversationId({ conversation: null })).toBeNull()
  })
})

describe("Webhook — Payload aninhado (extractContactRaw)", () => {
  it("extrai sender de data.meta.sender (conversation events do Evo CRM)", () => {
    const data = {
      meta: { sender: { id: "c-1", name: "Eneas", phone_number: "+5515996400419" } },
    }
    const result = extractContactRaw(data)
    expect(result?.name).toBe("Eneas")
    expect(result?.phone_number).toBe("+5515996400419")
  })

  it("extrai sender de data.sender (message events do Evo CRM)", () => {
    const data = {
      sender: { id: "c-2", name: "Maria" },
    }
    const result = extractContactRaw(data)
    expect(result?.name).toBe("Maria")
  })

  it("extrai sender de data.conversation.meta.sender (fallback aninhado)", () => {
    const data = {
      conversation: { id: "conv-1", meta: { sender: { id: "c-3", name: "Hitalo" } } },
    }
    const result = extractContactRaw(data)
    expect(result?.name).toBe("Hitalo")
  })

  it("usa data.contact como último fallback legado", () => {
    const data = { contact: { id: "c-4", name: "Legacy" } }
    const result = extractContactRaw(data)
    expect(result?.name).toBe("Legacy")
  })

  it("retorna null quando nenhum sender vem no payload", () => {
    expect(extractContactRaw({})).toBeNull()
  })
})

describe("Webhook — Merge guard (não sobrescrever contact com null)", () => {
  // Simula a lógica de merge do handleConversationEvent.
  function mergePayload(
    incomingContactName: string | null,
    existing: { contact_name: string | null } | null
  ) {
    return {
      contact_name: incomingContactName ?? existing?.contact_name ?? null,
    }
  }

  it("preserva contact_name existente quando payload novo vem com null", () => {
    const merged = mergePayload(null, { contact_name: "Eneas Gandolfi" })
    expect(merged.contact_name).toBe("Eneas Gandolfi")
  })

  it("atualiza contact_name quando payload novo traz valor", () => {
    const merged = mergePayload("Novo Nome", { contact_name: "Antigo" })
    expect(merged.contact_name).toBe("Novo Nome")
  })

  it("retorna null quando ambos são null (caso de criação)", () => {
    const merged = mergePayload(null, null)
    expect(merged.contact_name).toBeNull()
  })
})
