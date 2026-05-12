/**
 * Arquivo: src/services/evo-crm/__tests__/chaos.test.ts
 * Propósito: Exercer o caminho Evo CRM → cliente → UI sob falhas que produzem
 *            "dados não carregam" silenciosamente em produção:
 *
 *   - 401 (token UUID inválido)
 *   - 504 (gateway timeout do upstream)
 *   - body vazio com status 200 (proxy / kong / load balancer)
 *   - latência > timeout → AbortError tipado
 *   - drift de schema (campo com tipo errado)
 *   - HTML em vez de JSON (Traefik login page, etc.)
 *   - erro de rede absoluto
 *
 * Cada caso exercita a chamada real `listConversations` através de MSW.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createEvoCrmClient } from '../client'
import { EvoCrmSchemaError } from '../schemas'
import { chaos, EVO_TEST_BASE_URL } from './msw/handlers'
import { server } from './msw/server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  delete process.env.EVO_HTTP_TIMEOUT_MS_OVERRIDE
})

afterAll(() => {
  server.close()
})

function makeClient() {
  return createEvoCrmClient({
    baseUrl: EVO_TEST_BASE_URL,
    apiToken: 'test-uuid-token',
  })
}

describe('EvoCrmClient — chaos scenarios via MSW', () => {
  it('happy path: listConversations retorna 2 itens com envelope {success, data}', async () => {
    const client = makeClient()
    const rows = await client.listConversations(10)
    expect(rows).toHaveLength(2)
    expect(rows[0].id).toBe('conv-1')
    expect(rows[1].id).toBe('conv-2')
  })

  it('401: lança Error com status e código do envelope do Evo', async () => {
    server.use(chaos.unauthorized())
    const client = makeClient()
    await expect(client.listConversations(10)).rejects.toThrow(
      /Evo CRM.*INVALID_TOKEN/
    )
  })

  it('504: lança Error com status no message', async () => {
    server.use(chaos.gatewayTimeout())
    const client = makeClient()
    await expect(client.listConversations(10)).rejects.toThrow(/504/)
  })

  it('body vazio com 200: schema gate dispara EvoCrmSchemaError (vazio mentiroso)', async () => {
    server.use(chaos.emptyBody())
    const client = makeClient()
    let caught: unknown
    try {
      await client.listConversations(10)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(EvoCrmSchemaError)
    expect((caught as EvoCrmSchemaError).context).toBe('listConversations')
  })

  it('latência > timeout: AbortError convertido em mensagem PT-BR', async () => {
    process.env.EVO_HTTP_TIMEOUT_MS_OVERRIDE = '100'
    server.use(chaos.slowResponse(400))
    const client = makeClient()
    await expect(client.listConversations(10)).rejects.toThrow(
      /timeout ao conectar com o Evo CRM/
    )
  })

  it('drift de schema (id boolean): EvoCrmSchemaError com contexto e issues', async () => {
    server.use(chaos.schemaDrift())
    const client = makeClient()
    let caught: EvoCrmSchemaError | null = null
    try {
      await client.listConversations(10)
    } catch (err) {
      if (err instanceof EvoCrmSchemaError) caught = err
    }
    expect(caught).not.toBeNull()
    expect(caught!.context).toBe('listConversations')
    expect(caught!.issues.length).toBeGreaterThan(0)
  })

  it('HTML em vez de JSON: lança Error explícito sobre o origin', async () => {
    server.use(chaos.htmlInsteadOfJson())
    const client = makeClient()
    await expect(client.listConversations(10)).rejects.toThrow(
      /Evo CRM retornou HTML em vez de JSON/
    )
  })

  it('erro de rede absoluto: convertido em mensagem PT-BR com origin', async () => {
    // Silencia o ruído do MSW logando "unhandled rejection".
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(chaos.networkError())
    const client = makeClient()
    await expect(client.listConversations(10)).rejects.toThrow(
      /Falha ao conectar com o Evo CRM/
    )
  })
})
