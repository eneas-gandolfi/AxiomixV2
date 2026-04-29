/**
 * Arquivo: src/services/evo-crm/factory.ts
 * Propósito: Factory com cache para clientes Evo CRM por company.
 *
 * Cada company tem sua própria stack Evo CRM com credenciais isoladas.
 * O cache evita buscar credenciais do Supabase a cada request.
 * TTL de 5 minutos garante que rotação de credenciais propague.
 *
 * Usa lazy import de client.ts para evitar dependência circular.
 */

import type { EvoCrmClient } from './types'
import { EvoCrmNotConfiguredError } from './errors'

// ---------------------------------------------------------------------------
// Cache por companyId com TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

type CacheEntry = {
  client: EvoCrmClient
  expiresAt: number
}

const clientCache = new Map<string, CacheEntry>()

/**
 * Retorna um EvoCrmClient para a company especificada.
 * Usa cache em memória com TTL de 5 minutos.
 *
 * @throws {EvoCrmNotConfiguredError} se a company não tem integração Evo CRM configurada
 */
export async function getCachedEvoCrmClient(companyId: string): Promise<EvoCrmClient> {
  if (!companyId) {
    throw new EvoCrmNotConfiguredError('(vazio)')
  }

  const now = Date.now()
  const cached = clientCache.get(companyId)

  if (cached && cached.expiresAt > now) {
    return cached.client
  }

  // Lazy import para evitar dependência circular factory <-> client
  const { buildEvoCrmClient } = await import('./client')
  const client = await buildEvoCrmClient(companyId)

  clientCache.set(companyId, {
    client,
    expiresAt: now + CACHE_TTL_MS,
  })

  return client
}

/**
 * Invalida o cache para uma company específica.
 * Útil após rotação de credenciais.
 */
export function invalidateEvoCrmCache(companyId: string): void {
  clientCache.delete(companyId)
}

/**
 * Limpa todo o cache. Usado em testes.
 */
export function clearEvoCrmCache(): void {
  clientCache.clear()
}

/**
 * Retorna o tamanho atual do cache. Usado em testes.
 */
export function getEvoCrmCacheSize(): number {
  return clientCache.size
}
