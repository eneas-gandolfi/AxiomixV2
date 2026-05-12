/**
 * Arquivo: src/services/evo-crm/schemas.ts
 * Propósito: Schemas Zod para validar respostas do Evo CRM e detectar schema drift
 *            (campo renomeado, tipo mudado, payload novo) antes que vire bug silencioso
 *            de "dados não carregam" na UI.
 *
 * Princípio: schemas permissivos (campos esperados como opcionais/nullable, .passthrough
 * para tolerar campos novos), mas **falham loud** quando um campo conhecido vier com
 * tipo diferente do esperado. Isso é o ponto cego principal levantado no roundtable:
 * status 200 com payload "estranho" passa direto e quebra renderização downstream.
 *
 * Estratégia de adoção: cobrir os endpoints de maior tráfego primeiro (listConversations,
 * listMessages). Os parsers manuais existentes em client.ts continuam funcionando — os
 * schemas servem como gate adicional via `parseEvoResponse`.
 *
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Erros tipados
// ---------------------------------------------------------------------------

/**
 * Lançado quando uma resposta do Evo CRM viola o schema esperado.
 * O `context` indica qual endpoint/operação para facilitar triagem nos logs.
 */
export class EvoCrmSchemaError extends Error {
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
    super(`Schema do Evo CRM violado em ${context}: ${issueSummary}${extra}`)
    this.name = 'EvoCrmSchemaError'
  }
}

// ---------------------------------------------------------------------------
// Helpers de schema
// ---------------------------------------------------------------------------

/** ID externo pode chegar como string ou número — normalizamos para string. */
export const ExternalIdSchema = z.union([z.string(), z.number()]).transform((v) => String(v))

/** Timestamp Unix em segundos OU ISO string OU null. */
export const TimestampSchema = z.union([z.string(), z.number(), z.null()]).optional()

// ---------------------------------------------------------------------------
// Schemas de payload do Evo CRM
// ---------------------------------------------------------------------------

export const EvoContactRefSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().nullish(),
    phone: z.string().nullish(),
    phone_e164: z.string().nullish(),
    phone_number: z.string().nullish(),
    profile_picture: z.string().nullish(),
  })
  .passthrough()

export const EvoConversationRawSchema = z
  .object({
    id: ExternalIdSchema,
    phone_e164: z.string().nullish(),
    remote_jid: z.string().nullish(),
    status: z.string().nullish(),
    last_message_at: TimestampSchema,
    last_customer_message_at: TimestampSchema,
    last_activity_at: TimestampSchema,
    updated_at: TimestampSchema,
    created_at: TimestampSchema,
    profile_picture: z.string().nullish(),
    contact_id: z.union([z.string(), z.number()]).nullish(),
    contact_name: z.string().nullish(),
    contact: EvoContactRefSchema.nullish(),
    assignee_id: z.union([z.string(), z.number()]).nullish(),
    assigneeId: z.union([z.string(), z.number()]).nullish(),
    assigned_to: z.union([z.string(), z.number()]).nullish(),
    assignee: z
      .object({ id: z.union([z.string(), z.number()]).optional() })
      .passthrough()
      .nullish(),
    meta: z
      .object({
        assignee: z
          .object({ id: z.union([z.string(), z.number()]).optional() })
          .passthrough()
          .nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough()

/**
 * Envelope padrão das listagens de conversation no Evo CRM v4.2.0.
 * Pode vir como `{success, data}` envelope OU array direto OU `{conversations: [...]}`.
 */
export const EvoConversationsListSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.array(EvoConversationRawSchema),
    meta: z.unknown().optional(),
  }),
  z.object({
    conversations: z.array(EvoConversationRawSchema),
  }),
  z.array(EvoConversationRawSchema),
])

export const EvoMessageRawSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish(),
    message_id: z.union([z.string(), z.number()]).nullish(),
    uuid: z.union([z.string(), z.number()]).nullish(),
    external_id: z.union([z.string(), z.number()]).nullish(),
    content: z.string().nullish(),
    body: z.string().nullish(),
    text: z.string().nullish(),
    message: z.string().nullish(),
    caption: z.string().nullish(),
    direction: z.string().nullish(),
    message_type: z.string().nullish(),
    type: z.string().nullish(),
    media_type: z.string().nullish(),
    media_url: z.string().nullish(),
    file_url: z.string().nullish(),
    attachment_url: z.string().nullish(),
    from_me: z.boolean().nullish(),
    fromMe: z.boolean().nullish(),
    created_at: z.union([z.string(), z.number()]).nullish(),
    createdAt: z.union([z.string(), z.number()]).nullish(),
    sent_at: z.union([z.string(), z.number()]).nullish(),
    timestamp: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough()

export const EvoErrorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string().nullish(),
        message: z.string().nullish(),
      })
      .passthrough(),
  })
  .passthrough()

// ---------------------------------------------------------------------------
// Helper público
// ---------------------------------------------------------------------------

/**
 * Valida `payload` contra `schema`. Em falha:
 *  - loga as 3 primeiras issues + preview do payload (até 500 chars) no stderr
 *  - lança EvoCrmSchemaError com contexto, issues e sample
 *
 * Em sucesso, retorna o valor parseado (com transforms aplicados).
 */
export function parseEvoResponse<S extends z.ZodTypeAny>(
  schema: S,
  payload: unknown,
  context: string
): z.infer<S> {
  // Antes do schema "feliz": se o payload é um envelope de erro do Evo, propaga
  // como EvoCrmSchemaError com o código/mensagem do Evo para diagnóstico fácil.
  const errorEnvelope = EvoErrorEnvelopeSchema.safeParse(payload)
  if (errorEnvelope.success) {
    const code = errorEnvelope.data.error.code ?? 'UNKNOWN'
    const message = errorEnvelope.data.error.message ?? 'sem mensagem'
    throw new EvoCrmSchemaError(
      context,
      [
        {
          code: 'custom',
          path: ['error'],
          message: `[${code}] ${message}`,
          input: payload,
        },
      ],
      JSON.stringify(payload).slice(0, 500)
    )
  }

  const result = schema.safeParse(payload)
  if (result.success) {
    return result.data
  }

  const sample = JSON.stringify(payload).slice(0, 500)
  console.error(
    `[evo-schema] Drift em ${context}:`,
    result.error.issues.slice(0, 3),
    'sample:',
    sample
  )
  throw new EvoCrmSchemaError(context, result.error.issues, sample)
}
