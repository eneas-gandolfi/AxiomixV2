/**
 * Arquivo: src/components/dashboard/demo-banner.tsx
 * Propósito: Banner persistente de modo demonstração
 */

'use client'

import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoBannerProps = {
  className?: string
}

export function DemoBanner({ className }: DemoBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-4 py-2',
        'bg-primary/10 border border-primary/20',
        'ax-body text-sm text-primary',
        className,
      )}
    >
      <Eye size={14} />
      <span>
        <strong>Modo demonstração</strong> — dados simulados do Fashion Center para visualização.
      </span>
    </div>
  )
}
