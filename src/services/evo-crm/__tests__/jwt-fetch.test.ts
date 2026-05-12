/**
 * Arquivo: src/services/evo-crm/__tests__/jwt-fetch.test.ts
 * Propósito: Garantir que fetchWithJwtRefresh refaz login após 401, propaga
 *            envelope `{success, data}`, e converte erros de rede/timeout em
 *            mensagens PT-BR.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchWithJwtRefresh } from '../jwt-fetch'

vi.mock('../auth', () => ({
  getEvoAuthJwt: vi.fn(),
  clearEvoAuthCache: vi.fn(),
}))

// Importação tardia para garantir que o mock acima já foi aplicado.
import { clearEvoAuthCache, getEvoAuthJwt } from '../auth'

const mockGetJwt = vi.mocked(getEvoAuthJwt)
const mockClearCache = vi.mocked(clearEvoAuthCache)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('fetchWithJwtRefresh', () => {
  beforeEach(() => {
    mockGetJwt.mockReset()
    mockClearCache.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('happy path: 200 OK, desembrulha envelope {success, data}', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'agent-1' } }))

    const result = await fetchWithJwtRefresh<{ id: string }>('https://evo.example/api/v1/agents')

    expect(result).toEqual({ id: 'agent-1' })
    expect(mockGetJwt).toHaveBeenCalledTimes(1)
    expect(mockClearCache).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0]
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer jwt-1',
    })
  })

  it('retorna {} em 204 No Content sem chamar JSON.parse', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }))

    const result = await fetchWithJwtRefresh('https://evo.example/api/v1/agents/x', {
      method: 'DELETE',
    })

    expect(result).toEqual({})
  })

  it('refresh em 401: limpa cache, refaz login e retorna 200 no retry', async () => {
    mockGetJwt
      .mockResolvedValueOnce('jwt-expired')
      .mockResolvedValueOnce('jwt-fresh')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const result = await fetchWithJwtRefresh<{ ok: boolean }>(
      'https://evo.example/api/v1/agents'
    )

    expect(result).toEqual({ ok: true })
    expect(mockClearCache).toHaveBeenCalledTimes(1)
    expect(mockGetJwt).toHaveBeenCalledTimes(2)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // O retry deve usar o JWT novo.
    const [, retryInit] = fetchSpy.mock.calls[1]
    expect((retryInit as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer jwt-fresh',
    })
  })

  it('401 persistente após refresh: lança erro tipado, NÃO tenta uma 3ª vez', async () => {
    mockGetJwt.mockResolvedValue('jwt-any')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('still unauthorized', { status: 401 }))

    await expect(
      fetchWithJwtRefresh('https://evo.example/api/v1/agents', { serviceLabel: 'Test' })
    ).rejects.toThrow(/Test GET .*401/)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(mockClearCache).toHaveBeenCalledTimes(1)
  })

  it('erro 5xx: lança erro com status e label', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 503 })
    )

    await expect(
      fetchWithJwtRefresh('https://evo.example/api/v1/agents', { serviceLabel: 'Evo' })
    ).rejects.toThrow(/Evo GET .*503 boom/)
    expect(mockClearCache).not.toHaveBeenCalled()
  })

  it('AbortError: converte para mensagem PT-BR de timeout', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    await expect(
      fetchWithJwtRefresh('https://evo.example/x', {
        serviceLabel: 'Evo Test',
        timeoutMs: 50,
      })
    ).rejects.toThrow(/Tempo esgotado ao chamar Evo Test/)
  })

  it('TypeError "fetch failed": converte para mensagem PT-BR de rede', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
      const err = new TypeError('fetch failed')
      ;(err as Error & { cause?: unknown }).cause = { code: 'ECONNREFUSED' }
      return Promise.reject(err)
    })

    await expect(
      fetchWithJwtRefresh('https://evo.example/x', { serviceLabel: 'Evo' })
    ).rejects.toThrow(/Falha de rede ao chamar Evo.*ECONNREFUSED/)
  })

  it('resposta sem envelope `{success, data}` é retornada crua', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse([{ id: 'a' }, { id: 'b' }])
    )

    const result = await fetchWithJwtRefresh<unknown>(
      'https://evo.example/api/v1/list'
    )
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('resposta com body vazio em 200 retorna {}', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 200 }))

    const result = await fetchWithJwtRefresh('https://evo.example/api/v1/op', {
      method: 'POST',
    })
    expect(result).toEqual({})
  })

  it('resposta não-JSON com 200 lança erro tipado', async () => {
    mockGetJwt.mockResolvedValue('jwt-1')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>oops</html>', { status: 200 })
    )

    await expect(
      fetchWithJwtRefresh('https://evo.example/x', { serviceLabel: 'Evo' })
    ).rejects.toThrow(/resposta não-JSON/)
  })
})
