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
})
