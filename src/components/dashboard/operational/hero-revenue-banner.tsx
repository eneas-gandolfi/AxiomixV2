/**
 * Arquivo: src/components/dashboard/operational/hero-revenue-banner.tsx
 * Propósito: Banner principal "Você está deixando R$X/mês escapar"
 */

'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useAnimatedValue } from '@/lib/hooks/use-animated-value'
import { DecisionAxis } from '@/components/ui/decision-axis'
import { cn } from '@/lib/utils'

type HeroRevenueBannerProps = {
  revenueAtRisk: number
  leadsGoingCold: number
  onViewLeads?: () => void
  viewLeadsHref?: string
}

export function HeroRevenueBanner({
  revenueAtRisk,
  leadsGoingCold,
  onViewLeads,
  viewLeadsHref,
}: HeroRevenueBannerProps) {
  const animatedRevenue = useAnimatedValue(revenueAtRisk)
  const ctaClass = 'mt-1 flex w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-2 ax-body text-sm font-medium text-white btn-glow transition-all hover:bg-primary-hover'

  return (
    <DecisionAxis active animated>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-primary/20 p-5 sm:p-6',
          'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
          'opacity-0 animate-ax-emerge',
        )}
      >
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <AlertTriangle size={18} />
            <span className="ax-kpi-label text-primary">Atenção</span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="ax-body text-tx-secondary">
              Você está deixando aproximadamente
            </p>
            <p className="ax-kpi text-3xl text-primary sm:text-4xl">
              R$ {animatedRevenue.toLocaleString('pt-BR')}
              <span className="ax-body ml-1 text-base font-normal text-tx-secondary">/mês</span>
            </p>
            <p className="ax-body text-tx-secondary">
              escapar por problemas no atendimento via WhatsApp.
            </p>
          </div>

          <p className="ax-body text-sm text-tx-secondary">
            <strong className="text-warning">{leadsGoingCold} leads</strong> mostraram interesse e
            não foram atendidos adequadamente nos últimos 30 dias.
          </p>

          {viewLeadsHref ? (
            <a href={viewLeadsHref} className={ctaClass} aria-label="Ver leads que esfriaram">
              Ver esses leads
              <ArrowRight size={14} />
            </a>
          ) : onViewLeads ? (
            <button
              type="button"
              onClick={onViewLeads}
              className={ctaClass}
              aria-label="Ver leads que esfriaram"
            >
              Ver esses leads
              <ArrowRight size={14} />
            </button>
          ) : null}
        </div>

        {/* Decorative glow */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      </div>
    </DecisionAxis>
  )
}
