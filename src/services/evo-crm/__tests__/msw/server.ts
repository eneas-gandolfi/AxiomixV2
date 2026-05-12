/**
 * Arquivo: src/services/evo-crm/__tests__/msw/server.ts
 * Propósito: Instância única do MSW node server para os testes do Evo CRM.
 *
 * Importar nos testes que precisam interceptar fetch:
 *   import { server } from './msw/server'
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
 *   afterEach(() => server.resetHandlers())
 *   afterAll(() => server.close())
 */

import { setupServer } from 'msw/node'

import { defaultHandlers } from './handlers'

export const server = setupServer(...defaultHandlers)
