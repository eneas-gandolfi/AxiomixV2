/**
 * Arquivo: src/services/evo-crm/jwt-fetch.ts
 * Propósito: Fetch tipado contra serviços do Evo CRM que exigem Bearer JWT do
 *            evo-auth-service, com refresh automático em 401.
 *
 * Comportamento:
 *   1. Resolve JWT via `getEvoAuthJwt()` (cache em memória, single-flight).
 *   2. Faz a request com `Authorization: Bearer <jwt>`.
 *   3. Se 401: limpa cache via `clearEvoAuthCache()` e tenta UMA vez mais.
 *   4. Em AbortError ou erro de rede: lança erro tipado em PT-BR.
 *
 * Reutilizável: qualquer serviço Evo que precise de JWT (Core/Processor) chama isto.
 * Knowledge Service hoje usa api_access_token UUID — NÃO usa este helper.
 *
 * Autor: AXIOMIX
 * Data: 2026-05-12
 */

import { clearEvoAuthCache, getEvoAuthJwt } from './auth'

export type JwtFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  /** Timeout em ms (default 15_000). */
  timeoutMs?: number
  /** Rótulo amigável para mensagens de erro (default: derivado do path). */
  serviceLabel?: string
}

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Faz uma request HTTP a um serviço Evo que requer Bearer JWT.
 * Retorna o payload desembrulhado quando a resposta segue o envelope padrão
 * `{success: true, data: ...}`; caso contrário, retorna o JSON cru.
 *
 * Lança Error tipado em PT-BR quando:
 *   - 401 persiste após o retry (cache foi limpo e re-login não ajudou)
 *   - res.status >= 400 (não-401, ou 401 já no retry)
 *   - AbortError (timeout)
 *   - Falha de rede
 */
export async function fetchWithJwtRefresh<T = unknown>(
  url: string,
  options: JwtFetchOptions = {}
): Promise<T> {
  return doRequest<T>(url, options, false)
}

async function doRequest<T>(
  url: string,
  options: JwtFetchOptions,
  isRetry: boolean
): Promise<T> {
  const method = options.method ?? 'GET'
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const label = options.serviceLabel ?? 'Evo'

  const jwt = await getEvoAuthJwt()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `Tempo esgotado ao chamar ${label} (${method} ${url}, >${timeoutMs}ms). Tente novamente.`
      )
    }
    if (err instanceof Error && (err.name === 'TypeError' || err.message === 'fetch failed')) {
      const cause =
        typeof err.cause === 'object' && err.cause !== null
          ? (err.cause as Record<string, unknown>)
          : null
      const code = cause && typeof cause.code === 'string' ? cause.code : 'unknown'
      throw new Error(
        `Falha de rede ao chamar ${label} (${method} ${url}, ${code}). Tente novamente.`
      )
    }
    throw err
  }
  clearTimeout(timer)

  // 204/202: corpo vazio é resposta válida.
  if (res.status === 204 || res.status === 202) {
    return {} as T
  }

  // 401: JWT expirou ou foi invalidado pelo servidor — limpa cache e tenta UMA vez mais.
  if (res.status === 401 && !isRetry) {
    clearEvoAuthCache()
    return doRequest<T>(url, options, true)
  }

  const text = await res.text()

  if (res.status >= 400) {
    throw new Error(`${label} ${method} ${url}: ${res.status} ${text.slice(0, 200)}`)
  }

  if (!text.trim()) return {} as T

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${label} retornou resposta não-JSON (${method} ${url}).`)
  }

  // Desembrulha envelope padrão `{success: true, data: ...}`.
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    (json as Record<string, unknown>).success === true &&
    'data' in (json as Record<string, unknown>)
  ) {
    return (json as Record<string, unknown>).data as T
  }

  return json as T
}
