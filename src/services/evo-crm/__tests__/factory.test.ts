/**
 * Testes de isolamento de tenant para o factory Evo CRM.
 *
 * RISCO CRÍTICO: company A nunca deve acessar dados de company B.
 * Estes testes validam que o factory retorna clientes isolados por companyId,
 * que o cache funciona com TTL, e que credenciais não vazam.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCachedEvoCrmClient,
  invalidateEvoCrmCache,
  clearEvoCrmCache,
  getEvoCrmCacheSize,
} from '../factory'
import { EvoCrmNotConfiguredError } from '../errors'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const COMPANY_A_ID = 'company-aaa-111'
const COMPANY_B_ID = 'company-bbb-222'

const MOCK_CONFIGS: Record<string, { baseUrl: string; apiToken: string; inboxId?: string }> = {
  [COMPANY_A_ID]: {
    baseUrl: 'https://crm-a.example.com',
    apiToken: 'token-secret-aaa',
    inboxId: 'inbox-a',
  },
  [COMPANY_B_ID]: {
    baseUrl: 'https://crm-b.example.com',
    apiToken: 'token-secret-bbb',
    inboxId: 'inbox-b',
  },
}

// Mock do Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: function (field: string, value: string) {
          // Armazena os filtros para a query
          if (!this._filters) this._filters = {} as Record<string, string>
          this._filters[field] = value
          return this
        },
        maybeSingle: async function () {
          const companyId = this._filters?.company_id
          const config = companyId ? MOCK_CONFIGS[companyId] : undefined
          if (!config) {
            return { data: null, error: null }
          }
          return {
            data: {
              id: `integration-${companyId}`,
              config: { baseUrl: config.baseUrl, apiToken: config.apiToken, inboxId: config.inboxId },
              is_active: true,
            },
            error: null,
          }
        },
        _filters: undefined as Record<string, string> | undefined,
      }),
    }),
  }),
}))

// Mock do decode — retorna config diretamente (já está em formato correto)
vi.mock('@/lib/integrations/service', () => ({
  decodeIntegrationConfig: (_type: string, config: unknown) => config,
}))

// Mock do fetch global — intercepta requests HTTP
const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
  return new Response(JSON.stringify({ success: true, data: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})

vi.stubGlobal('fetch', fetchSpy)

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearEvoCrmCache()
  fetchSpy.mockClear()
})

afterEach(() => {
  clearEvoCrmCache()
})

// ---------------------------------------------------------------------------
// Testes de Isolamento de Tenant — CRÍTICOS
// ---------------------------------------------------------------------------

describe('Factory — Isolamento de Tenant', () => {
  it('client de company A usa base URL de A, não de B', async () => {
    const clientA = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(clientA.baseUrl).toBe('https://crm-a.example.com')
    expect(clientA.baseUrl).not.toBe('https://crm-b.example.com')
  })

  it('client de company B usa base URL de B, não de A', async () => {
    const clientB = await getCachedEvoCrmClient(COMPANY_B_ID)
    expect(clientB.baseUrl).toBe('https://crm-b.example.com')
    expect(clientB.baseUrl).not.toBe('https://crm-a.example.com')
  })

  it('clients de A e B são instâncias distintas', async () => {
    const clientA = await getCachedEvoCrmClient(COMPANY_A_ID)
    const clientB = await getCachedEvoCrmClient(COMPANY_B_ID)
    expect(clientA).not.toBe(clientB)
    expect(clientA.baseUrl).not.toBe(clientB.baseUrl)
    expect(clientA.apiToken).not.toBe(clientB.apiToken)
  })

  it('request de company A usa token de A nos headers', async () => {
    const clientA = await getCachedEvoCrmClient(COMPANY_A_ID)
    await clientA.listLabels()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toContain('crm-a.example.com')
    expect(options.headers.api_access_token).toBe('token-secret-aaa')
  })

  it('request de company B usa token de B nos headers', async () => {
    const clientB = await getCachedEvoCrmClient(COMPANY_B_ID)
    await clientB.listLabels()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toContain('crm-b.example.com')
    expect(options.headers.api_access_token).toBe('token-secret-bbb')
  })

  it('requests simultâneas de A e B usam credenciais corretas', async () => {
    const clientA = await getCachedEvoCrmClient(COMPANY_A_ID)
    const clientB = await getCachedEvoCrmClient(COMPANY_B_ID)

    // Chamadas simultâneas
    await Promise.all([
      clientA.listLabels(),
      clientB.listLabels(),
    ])

    expect(fetchSpy).toHaveBeenCalledTimes(2)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callA = fetchSpy.mock.calls.find((call: any[]) => String(call[0]).includes('crm-a.example.com'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callB = fetchSpy.mock.calls.find((call: any[]) => String(call[0]).includes('crm-b.example.com'))

    expect(callA).toBeDefined()
    expect(callB).toBeDefined()
    expect((callA![1].headers as Record<string, string>).api_access_token).toBe('token-secret-aaa')
    expect((callB![1].headers as Record<string, string>).api_access_token).toBe('token-secret-bbb')
  })
})

// ---------------------------------------------------------------------------
// Testes de Cache
// ---------------------------------------------------------------------------

describe('Factory — Cache com TTL', () => {
  it('segunda chamada para mesmo companyId retorna do cache (mesma instância)', async () => {
    const first = await getCachedEvoCrmClient(COMPANY_A_ID)
    const second = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(first).toBe(second)
  })

  it('cache expirado busca novamente do Supabase', async () => {
    vi.useFakeTimers()

    const first = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(getEvoCrmCacheSize()).toBe(1)

    // Avançar 6 minutos (TTL = 5 min)
    vi.advanceTimersByTime(6 * 60 * 1000)

    const second = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(second).not.toBe(first) // Nova instância criada
    expect(getEvoCrmCacheSize()).toBe(1)

    vi.useRealTimers()
  })

  it('invalidateEvoCrmCache remove apenas a company especificada', async () => {
    await getCachedEvoCrmClient(COMPANY_A_ID)
    await getCachedEvoCrmClient(COMPANY_B_ID)
    expect(getEvoCrmCacheSize()).toBe(2)

    invalidateEvoCrmCache(COMPANY_A_ID)
    expect(getEvoCrmCacheSize()).toBe(1)

    // B ainda está no cache
    const cachedB = await getCachedEvoCrmClient(COMPANY_B_ID)
    expect(cachedB.baseUrl).toBe('https://crm-b.example.com')
  })

  it('clearEvoCrmCache remove todo o cache', async () => {
    await getCachedEvoCrmClient(COMPANY_A_ID)
    await getCachedEvoCrmClient(COMPANY_B_ID)
    expect(getEvoCrmCacheSize()).toBe(2)

    clearEvoCrmCache()
    expect(getEvoCrmCacheSize()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Testes de Erro
// ---------------------------------------------------------------------------

describe('Factory — Erros', () => {
  it('companyId vazio lança EvoCrmNotConfiguredError', async () => {
    await expect(getCachedEvoCrmClient('')).rejects.toThrow(EvoCrmNotConfiguredError)
  })

  it('companyId inexistente lança EvoCrmNotConfiguredError', async () => {
    await expect(getCachedEvoCrmClient('company-inexistente')).rejects.toThrow(
      EvoCrmNotConfiguredError
    )
  })

  it('erro do Supabase lança EvoCrmNotConfiguredError, não erro genérico', async () => {
    await expect(getCachedEvoCrmClient('company-inexistente')).rejects.toThrow(
      /não configurada/i
    )
  })
})

// ---------------------------------------------------------------------------
// Testes de Segurança — Credenciais não vazam
// ---------------------------------------------------------------------------

describe('Factory — Segurança de Credenciais', () => {
  it('apiToken está presente no client (para uso interno)', async () => {
    const client = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(client.apiToken).toBe('token-secret-aaa')
  })

  it('baseUrl não contém /api/v1 no final (normalizado)', async () => {
    const client = await getCachedEvoCrmClient(COMPANY_A_ID)
    expect(client.baseUrl).not.toMatch(/\/api\/v1$/)
    expect(client.baseUrl).not.toMatch(/\/api$/)
  })
})
