/**
 * Arquivo: src/lib/supabase/schemas.ts
 * Propósito: Helpers Zod para validar respostas do Supabase e detectar drift
 *            (schema migrado, JSON malformado, dado inesperado) antes que vire
 *            "dados não carregam" silencioso na UI.
 *
 * Princípio: helpers genéricos `parseSupabaseRow` / `parseSupabaseRows` que
 * envelopam `safeParse` com:
 *   - distinção entre `data: null` (.maybeSingle vazio) e drift real
 *   - distinção entre `data: []` (lista vazia legítima) e drift real
 *   - log estruturado em falha + erro tipado para o caller capturar
 *
 * Adoção opt-in nos call sites de queries críticas (auth, integrações, pricing,
 * RLS). Não é wrapper global — fica explícito onde a validação existe.
 *
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

import { z } from 'zod'

/**
 * Lançado quando uma linha (ou conjunto de linhas) do Supabase viola o schema esperado.
 * O `context` indica qual tabela/operação para facilitar triagem nos logs.
 */
export class SupabaseSchemaError extends Error {
  constructor(
    public readonly context: string,
    public readonly issues: z.core.$ZodIssue[],
    public readonly samplePayload: string
  ) {
    const issueSummary = issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    const extra = issues.length > 3 ? ` (+${issues.length - 3} mais)` : ''
    super(`Schema Supabase violado em ${context}: ${issueSummary}${extra}`)
    this.name = 'SupabaseSchemaError'
  }
}

/**
 * Valida uma única row do Supabase (resultado de `.single()` / `.maybeSingle()`).
 *
 * Semântica:
 *   - `row === null` → retorna `null` (não é drift; é "não existe")
 *   - `row === undefined` → tratado como `null`
 *   - schema falha → loga + lança SupabaseSchemaError
 *
 * Use quando o caller precisa diferenciar "linha não encontrada" de "linha com
 * forma inválida". A primeira é negócio normal; a segunda é incidente.
 */
export function parseSupabaseRow<S extends z.ZodTypeAny>(
  schema: S,
  row: unknown,
  context: string
): z.infer<S> | null {
  if (row === null || row === undefined) {
    return null
  }
  const result = schema.safeParse(row)
  if (result.success) {
    return result.data
  }

  const sample = JSON.stringify(row).slice(0, 500)
  console.error(
    `[supabase-schema] Drift em ${context}:`,
    result.error.issues.slice(0, 3),
    'sample:',
    sample
  )
  throw new SupabaseSchemaError(context, result.error.issues, sample)
}

/**
 * Valida um array de rows do Supabase (resultado de `.select()` sem `.single()`).
 *
 * Semântica:
 *   - `rows === null` → retorna `[]` (Supabase às vezes retorna null para 0 rows)
 *   - `rows === []` → retorna `[]` (lista vazia legítima — NÃO é drift)
 *   - schema falha em qualquer item → loga + lança SupabaseSchemaError
 *     com o índice do item ofensor no path
 *
 * Validar cada item separadamente dá mensagens de erro mais úteis ("row[3].id:
 * expected string, got null") do que validar como `z.array(...).safeParse(rows)`.
 */
export function parseSupabaseRows<S extends z.ZodTypeAny>(
  schema: S,
  rows: unknown,
  context: string
): z.infer<S>[] {
  if (rows === null || rows === undefined) {
    return []
  }
  if (!Array.isArray(rows)) {
    const sample = JSON.stringify(rows).slice(0, 500)
    const issue: z.core.$ZodIssue = {
      code: 'invalid_type',
      expected: 'array',
      path: [],
      message: `Esperado array, recebeu ${typeof rows}`,
      input: rows,
    }
    console.error(`[supabase-schema] Drift em ${context}:`, issue, 'sample:', sample)
    throw new SupabaseSchemaError(context, [issue], sample)
  }
  if (rows.length === 0) {
    return []
  }

  const parsed: z.infer<S>[] = []
  const allIssues: z.core.$ZodIssue[] = []

  for (let i = 0; i < rows.length; i++) {
    const result = schema.safeParse(rows[i])
    if (result.success) {
      parsed.push(result.data)
    } else {
      // Indexa as issues para apontar a row exata.
      for (const issue of result.error.issues) {
        allIssues.push({
          ...issue,
          path: [i, ...issue.path],
        })
      }
    }
  }

  if (allIssues.length > 0) {
    const sample = JSON.stringify(rows).slice(0, 500)
    console.error(
      `[supabase-schema] Drift em ${context}:`,
      allIssues.slice(0, 3),
      'sample:',
      sample
    )
    throw new SupabaseSchemaError(context, allIssues, sample)
  }

  return parsed
}
