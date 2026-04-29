/**
 * Arquivo: src/services/evo-crm/errors.ts
 * Propósito: Erros tipados para operações com Evo CRM.
 */

export class EvoCrmNotConfiguredError extends Error {
  constructor(companyId: string) {
    super(`Integração Evo CRM não configurada para a empresa ${companyId}.`)
    this.name = 'EvoCrmNotConfiguredError'
  }
}

export class EvoCrmAuthError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(`Autenticação Evo CRM falhou: ${message}`)
    this.name = 'EvoCrmAuthError'
  }
}

export class EvoCrmRateLimitError extends Error {
  public readonly retryAfterMs: number

  constructor(path: string, retryAfterMs = 15_000) {
    super(`Rate limit excedido no Evo CRM para ${path}. Retry em ${retryAfterMs / 1000}s.`)
    this.name = 'EvoCrmRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

export class EvoCrmApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly path: string,
    public readonly statusCode: number,
    public readonly evoCode: string,
    message: string
  ) {
    super(`Evo CRM ${method} ${path} [${evoCode}]: ${message}`)
    this.name = 'EvoCrmApiError'
  }
}
