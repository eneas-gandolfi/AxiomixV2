/**
 * Arquivo: src/components/dashboard/operational/cold-lead-card.tsx
 * Propósito: Card de lead esfriando com diagnóstico, ticket e sugestão IA
 */

'use client'

import { useState } from 'react'
import {
  Phone,
  Clock,
  DollarSign,
  Target,
  Lightbulb,
  Copy,
  Check,
  XCircle,
  AlertTriangle,
  Moon,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColdLead } from '@/lib/demo/fashion-center-data'

type ColdLeadCardProps = {
  lead: ColdLead
  index: number
}

const DIAGNOSIS_CONFIG: Record<
  ColdLead['diagnosisType'],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  no_response: {
    icon: <XCircle size={14} />,
    color: 'text-danger',
    bg: 'bg-danger-bg',
  },
  slow_response: {
    icon: <Timer size={14} />,
    color: 'text-warning',
    bg: 'bg-warning-bg',
  },
  incomplete_response: {
    icon: <AlertTriangle size={14} />,
    color: 'text-warning',
    bg: 'bg-warning-bg',
  },
  after_hours: {
    icon: <Moon size={14} />,
    color: 'text-info',
    bg: 'bg-info-bg',
  },
}

const INTENT_CONFIG: Record<ColdLead['intentLevel'], { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'text-danger' },
  media: { label: 'Média', color: 'text-warning' },
  baixa: { label: 'Baixa', color: 'text-tx-tertiary' },
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function timeAgo(dateStr: string): string {
  const then = new Date(dateStr)
  const thenMs = then.getTime()
  if (!Number.isFinite(thenMs)) return 'data desconhecida'
  // Compara dia de calendário (não delta absoluto) para "hoje"/"ontem" baterem com a percepção do usuário.
  const days = Math.max(0, Math.round((startOfDay(new Date()) - startOfDay(then)) / 86400000))
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

export function ColdLeadCard({ lead, index }: ColdLeadCardProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const diag = DIAGNOSIS_CONFIG[lead.diagnosisType]
  const intent = INTENT_CONFIG[lead.intentLevel]

  async function handleCopy() {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API indisponível')
      }
      await navigator.clipboard.writeText(lead.suggestedResponse)
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2500)
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-surface p-4 shadow-[var(--ax-shadow-md)]',
        'opacity-0 animate-ax-cascade',
      )}
      style={{ animationDelay: `${400 + index * 100}ms` }}
    >
      {/* Header: phone + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-tx-tertiary" />
          <span className="ax-mono text-sm text-text">{lead.phone}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} className="text-tx-tertiary" />
          <span className="ax-caption">{timeAgo(lead.receivedAt)}</span>
        </div>
      </div>

      {/* Original message */}
      <div className="mb-3 rounded-lg bg-surface-2 p-3">
        <p className="ax-body text-sm text-text italic">
          &ldquo;{lead.originalMessage}&rdquo;
        </p>
      </div>

      {/* Diagnosis */}
      <div className={cn('mb-3 flex items-start gap-2 rounded-lg p-2.5', diag.bg)}>
        <span className={diag.color}>{diag.icon}</span>
        <span className={cn('ax-body text-sm', diag.color)}>
          {lead.diagnosis}
        </span>
      </div>

      {/* Ticket + Intent */}
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <DollarSign size={12} className="text-tx-tertiary" />
          <span className="ax-caption">Ticket estimado:</span>
          <span className="ax-mono text-sm font-medium text-text">
            R$ {lead.estimatedTicket}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Target size={12} className="text-tx-tertiary" />
          <span className="ax-caption">Intenção:</span>
          <span className={cn('ax-mono text-sm font-medium', intent.color)}>
            {intent.label}
          </span>
        </div>
      </div>

      {/* AI Suggestion */}
      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb size={14} className="text-primary" />
          <span className="ax-kpi-label text-primary">Sugestão</span>
        </div>
        <p className="ax-body text-sm text-tx-secondary mb-2">
          {lead.suggestion}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar sugestão de resposta"
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5',
            'ax-body text-xs font-medium transition-all',
            copied
              ? 'bg-success/10 text-success'
              : copyError
                ? 'bg-danger-bg text-danger'
                : 'bg-surface border border-border text-tx-secondary hover:border-primary/30 hover:text-primary hover:shadow-[0_0_12px_rgb(var(--color-primary-rgb)/0.15)]',
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copyError ? 'Não foi possível copiar' : copied ? 'Copiado!' : 'Copiar sugestão de resposta'}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? 'Sugestão copiada para a área de transferência' : copyError ? 'Falha ao copiar sugestão' : ''}
        </span>
      </div>
    </div>
  )
}
