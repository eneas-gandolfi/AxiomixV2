/**
 * Arquivo: src/services/evo-crm/__tests__/schemas.test.ts
 * Propósito: Validar que parseEvoResponse detecta drift do Evo CRM (campo renomeado,
 *            tipo trocado, payload novo) e que envelopes de erro são propagados como
 *            EvoCrmSchemaError com o código real do Evo.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  EvoCrmSchemaError,
  EvoConversationsListSchema,
  EvoConversationRawSchema,
  parseEvoResponse,
} from '../schemas'

describe('EvoConversationsListSchema', () => {
  beforeEach(() => {
    // Silencia o console.error do parseEvoResponse durante os testes.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aceita envelope {success: true, data: [conversation]}', () => {
    const payload = {
      success: true,
      data: [
        {
          id: 'conv-1',
          phone_e164: '+5511999990001',
          status: 'open',
          created_at: 1700000000,
        },
      ],
    }

    const parsed = parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    expect(parsed).toBeDefined()
  })

  it('aceita formato legado {conversations: [...]}', () => {
    const payload = {
      conversations: [{ id: 42, status: 'open' }],
    }
    const parsed = parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    expect(parsed).toBeDefined()
  })

  it('aceita array direto (fallback do Evo)', () => {
    const payload = [{ id: 'conv-1' }, { id: 'conv-2' }]
    const parsed = parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    expect(parsed).toBeDefined()
  })

  it('aceita campos extras desconhecidos (passthrough)', () => {
    const payload = {
      success: true,
      data: [
        {
          id: 'conv-1',
          some_new_field_from_evo_v4_3: 'whatever',
          another: { nested: true },
        },
      ],
    }
    const parsed = parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    expect(parsed).toBeDefined()
  })

  it('lança EvoCrmSchemaError quando payload é objeto sem chave de conversations', () => {
    const payload = { unexpected: 'shape', no_id_no_data: true }

    expect(() =>
      parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    ).toThrow(EvoCrmSchemaError)
  })

  it('lança quando id da conversation vem com tipo errado (boolean)', () => {
    const payload = {
      success: true,
      data: [{ id: true, status: 'open' }],
    }

    let captured: EvoCrmSchemaError | null = null
    try {
      parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    } catch (err) {
      if (err instanceof EvoCrmSchemaError) captured = err
    }

    expect(captured).not.toBeNull()
    expect(captured!.context).toBe('listConversations')
    expect(captured!.issues.length).toBeGreaterThan(0)
  })

  it('lança quando body é vazio', () => {
    expect(() =>
      parseEvoResponse(EvoConversationsListSchema, {}, 'listConversations')
    ).toThrow(EvoCrmSchemaError)
  })

  it('lança quando envelope de erro do Evo é detectado, com código no message', () => {
    const payload = {
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido ou expirado.' },
    }

    let captured: EvoCrmSchemaError | null = null
    try {
      parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    } catch (err) {
      if (err instanceof EvoCrmSchemaError) captured = err
    }

    expect(captured).not.toBeNull()
    expect(captured!.message).toContain('[INVALID_TOKEN]')
    expect(captured!.message).toContain('Token inválido')
  })

  it('aceita conversation com contact aninhado', () => {
    const result = EvoConversationRawSchema.safeParse({
      id: 1,
      contact: { id: 'c1', name: 'João', phone_number: '+55119999' },
    })
    expect(result.success).toBe(true)
  })

  it('aceita conversation com timestamps como número Unix ou string ISO ou null', () => {
    const variants = [
      { id: 1, created_at: 1700000000 },
      { id: 2, created_at: '2024-11-14T12:00:00Z' },
      { id: 3, created_at: null },
      { id: 4 }, // ausente
    ]
    for (const v of variants) {
      const r = EvoConversationRawSchema.safeParse(v)
      expect(r.success).toBe(true)
    }
  })

  it('preview do payload é truncado em 500 chars no erro', () => {
    const longString = 'x'.repeat(1000)
    const payload = { weird: longString }

    let captured: EvoCrmSchemaError | null = null
    try {
      parseEvoResponse(EvoConversationsListSchema, payload, 'listConversations')
    } catch (err) {
      if (err instanceof EvoCrmSchemaError) captured = err
    }
    expect(captured!.samplePayload.length).toBeLessThanOrEqual(500)
  })
})
