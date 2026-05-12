/**
 * Arquivo: src/services/evo-crm/__tests__/msw/handlers.ts
 * Propósito: Handlers MSW base + helpers para cenários de chaos do Evo CRM.
 *
 * Permite alternar respostas por endpoint dentro de cada teste via runtime overrides
 * (server.use(...)), mantendo um conjunto default que retorna payloads válidos.
 *
 * Base URL usada nos testes: https://evo-test.example
 */

import { delay, http, HttpResponse } from 'msw'

export const EVO_TEST_BASE_URL = 'https://evo-test.example'

/** Resposta canônica de /conversations no envelope `{success, data}`. */
export const SUCCESS_CONVERSATIONS = {
  success: true,
  data: [
    {
      id: 'conv-1',
      phone_e164: '+5511999990001',
      status: 'open',
      created_at: 1700000000,
      contact: { id: 'c1', name: 'João', phone_number: '+5511999990001' },
    },
    {
      id: 'conv-2',
      phone_e164: '+5511999990002',
      status: 'open',
      created_at: 1700000010,
      contact: { id: 'c2', name: 'Maria', phone_number: '+5511999990002' },
    },
  ],
}

/** Handler default: feliz, 200 OK com payload válido. */
export const defaultHandlers = [
  http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
    HttpResponse.json(SUCCESS_CONVERSATIONS)
  ),
]

// ---------------------------------------------------------------------------
// Cenários de chaos — helpers para `server.use(...)` em testes individuais.
// ---------------------------------------------------------------------------

export const chaos = {
  /** 401 — token inválido. CRM Service usa api_access_token UUID; o cliente NÃO
   *  faz refresh (refresh é só do JWT do Auth Service). Deve lançar erro tipado. */
  unauthorized: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      HttpResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido.' } },
        { status: 401 }
      )
    ),

  /** 504 — gateway timeout do upstream. Sem retry no client (só 429 tem retry). */
  gatewayTimeout: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      HttpResponse.text('gateway timeout', { status: 504 })
    ),

  /** Body completamente vazio com 200. Edge case clássico. */
  emptyBody: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      new HttpResponse('', { status: 200 })
    ),

  /** Latência alta — simula hairpin NAT (>5s). Combina com EVO_HTTP_TIMEOUT_MS=5s
   *  no client.ts, então a request deve abortar com AbortError tipado. */
  slowResponse: (ms: number) =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, async () => {
      await delay(ms)
      return HttpResponse.json(SUCCESS_CONVERSATIONS)
    }),

  /** Drift de schema — campo `id` veio como boolean. Deve disparar EvoCrmSchemaError. */
  schemaDrift: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      HttpResponse.json({
        success: true,
        data: [{ id: true, status: 'open' }],
      })
    ),

  /** Resposta HTML em vez de JSON (proxy mal configurado, login page do Traefik etc). */
  htmlInsteadOfJson: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      HttpResponse.html('<html><body>Unauthorized</body></html>', { status: 200 })
    ),

  /** Rate limit 429 — sem header retry-after. O client tem retry interno (2x). */
  rateLimited: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () =>
      HttpResponse.json(
        { success: false, error: { code: 'RATE_LIMIT', message: 'Muitas requisições.' } },
        { status: 429 }
      )
    ),

  /** Erro de rede absoluto (sem resposta HTTP). */
  networkError: () =>
    http.get(`${EVO_TEST_BASE_URL}/api/v1/conversations`, () => HttpResponse.error()),
}
