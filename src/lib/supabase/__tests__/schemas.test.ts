/**
 * Arquivo: src/lib/supabase/__tests__/schemas.test.ts
 * Propósito: Cobrir o contrato de parseSupabaseRow / parseSupabaseRows,
 *            distinguindo null/empty legítimos de drift real de schema.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  SupabaseSchemaError,
  parseSupabaseRow,
  parseSupabaseRows,
} from '../schemas'

const RowSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    score: z.number().int(),
  })
  .passthrough()

describe('parseSupabaseRow (.maybeSingle / .single)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna null para data: null (linha não existe — não é drift)', () => {
    const result = parseSupabaseRow(RowSchema, null, 'companies.findById')
    expect(result).toBeNull()
  })

  it('retorna null para data: undefined (igual a null)', () => {
    const result = parseSupabaseRow(RowSchema, undefined, 'companies.findById')
    expect(result).toBeNull()
  })

  it('retorna a row parseada quando shape é válido', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Loja Exemplo',
      score: 42,
    }
    const result = parseSupabaseRow(RowSchema, row, 'companies.findById')
    expect(result).toEqual(row)
  })

  it('preserva campos extras (passthrough)', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Loja',
      score: 1,
      extra_field_from_new_migration: 'whatever',
    }
    const result = parseSupabaseRow(RowSchema, row, 'companies.findById')
    expect(result).toMatchObject({ extra_field_from_new_migration: 'whatever' })
  })

  it('lança SupabaseSchemaError quando campo está faltando', () => {
    const row = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'X' }
    expect(() =>
      parseSupabaseRow(RowSchema, row, 'companies.findById')
    ).toThrow(SupabaseSchemaError)
  })

  it('lança quando campo veio com tipo errado (drift de migration)', () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'X',
      score: 'not-a-number',
    }
    let caught: SupabaseSchemaError | null = null
    try {
      parseSupabaseRow(RowSchema, row, 'companies.findById')
    } catch (err) {
      if (err instanceof SupabaseSchemaError) caught = err
    }
    expect(caught).not.toBeNull()
    expect(caught!.context).toBe('companies.findById')
    expect(caught!.issues.length).toBeGreaterThan(0)
  })
})

describe('parseSupabaseRows (.select sem .single)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna [] para data: [] (lista vazia legítima — NÃO é drift)', () => {
    const result = parseSupabaseRows(RowSchema, [], 'companies.list')
    expect(result).toEqual([])
  })

  it('retorna [] para data: null (Supabase às vezes devolve null)', () => {
    const result = parseSupabaseRows(RowSchema, null, 'companies.list')
    expect(result).toEqual([])
  })

  it('retorna [] para data: undefined', () => {
    const result = parseSupabaseRows(RowSchema, undefined, 'companies.list')
    expect(result).toEqual([])
  })

  it('retorna rows parseadas em ordem', () => {
    const rows = [
      { id: '550e8400-e29b-41d4-a716-446655440000', name: 'A', score: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'B', score: 2 },
    ]
    const result = parseSupabaseRows(RowSchema, rows, 'companies.list')
    expect(result.map((r) => r.name)).toEqual(['A', 'B'])
  })

  it('lança quando rows não é array (algum endpoint malicioso devolveu objeto)', () => {
    expect(() =>
      parseSupabaseRows(RowSchema, { foo: 'bar' }, 'companies.list')
    ).toThrow(SupabaseSchemaError)
  })

  it('lança apontando o índice do item ofensor no path', () => {
    const rows = [
      { id: '550e8400-e29b-41d4-a716-446655440000', name: 'A', score: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'B', score: 'oops' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'C', score: 3 },
    ]
    let caught: SupabaseSchemaError | null = null
    try {
      parseSupabaseRows(RowSchema, rows, 'companies.list')
    } catch (err) {
      if (err instanceof SupabaseSchemaError) caught = err
    }
    expect(caught).not.toBeNull()
    // path deve começar com índice 1 (segunda row)
    expect(caught!.issues[0].path[0]).toBe(1)
  })

  it('acumula issues de múltiplas rows ofensoras', () => {
    const rows = [
      { id: 'not-uuid', name: 'A', score: 1 },
      { id: '550e8400-e29b-41d4-a716-446655440001', name: '', score: 2 },
    ]
    let caught: SupabaseSchemaError | null = null
    try {
      parseSupabaseRows(RowSchema, rows, 'companies.list')
    } catch (err) {
      if (err instanceof SupabaseSchemaError) caught = err
    }
    expect(caught).not.toBeNull()
    expect(caught!.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('sample do payload é truncado em 500 chars no erro', () => {
    const longRows = Array.from({ length: 50 }, (_, i) => ({
      id: `not-uuid-${i}`,
      name: 'X'.repeat(20),
      score: 1,
    }))
    let caught: SupabaseSchemaError | null = null
    try {
      parseSupabaseRows(RowSchema, longRows, 'companies.list')
    } catch (err) {
      if (err instanceof SupabaseSchemaError) caught = err
    }
    expect(caught!.samplePayload.length).toBeLessThanOrEqual(500)
  })
})
