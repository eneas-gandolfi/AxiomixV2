/**
 * Arquivo: src/app/(app)/error.tsx
 * Propósito: Error boundary para toda a área autenticada do app.
 *            Captura erros de Server Components, queries Supabase e fetches
 *            do Evo CRM antes que vire tela branca ou crash do root.
 *
 * Mensagens em PT-BR humanas, com retry e escape route pra rota mais usada
 * (Conversas WhatsApp) — caso o erro seja na rota atual mas o resto do app
 * esteja saudável.
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Loga com digest pra correlacionar com server logs / Sentry futuro.
    // eslint-disable-next-line no-console
    console.error('[app] erro capturado pelo boundary:', {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl text-[var(--color-text)]">
          Não conseguimos carregar esta tela
        </h2>
        <p className="ax-body max-w-md text-sm text-[var(--color-text-secondary)]">
          Algo falhou ao buscar seus dados. Pode ser uma instabilidade
          temporária da conexão ou do serviço. Tente novamente em alguns
          segundos.
        </p>
        {error.digest && (
          <p className="ax-mono text-xs text-[var(--color-text-tertiary)]">
            Código: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-10 rounded-md bg-[var(--color-primary)] px-5 ax-body text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Tentar novamente
        </button>
        <Link
          href="/whatsapp-intelligence/conversas"
          className="flex h-10 items-center justify-center rounded-md border border-border bg-surface px-5 ax-body text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          Ir para Conversas
        </Link>
      </div>
    </div>
  )
}
