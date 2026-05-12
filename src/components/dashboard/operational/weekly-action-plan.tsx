/**
 * Arquivo: src/components/dashboard/operational/weekly-action-plan.tsx
 * Propósito: 3 ações priorizadas por impacto em R$
 */

'use client'

import { cn } from '@/lib/utils'
import { DecisionAxis } from '@/components/ui/decision-axis'
import type { WeeklyAction } from '@/lib/demo/fashion-center-data'

type WeeklyActionPlanProps = {
  actions: WeeklyAction[]
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function WeeklyActionPlan({ actions }: WeeklyActionPlanProps) {
  const totalImpact = actions.reduce((s, a) => s + a.estimatedImpact, 0)

  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface p-4 shadow-[var(--ax-shadow-md)] opacity-0 animate-ax-cascade"
      style={{ animationDelay: '600ms' }}
    >
      <DecisionAxis active animated>
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="ax-t3 text-text">Plano de Ação da Semana</h3>
          <p className="ax-caption">
            Baseado na análise das conversas, estas ações teriam o maior impacto.
          </p>
        </div>
      </DecisionAxis>

      <div className="flex flex-col gap-3">
        {actions.map((action, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg border border-border/50 bg-surface-2/30 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-lg">
              {action.icon}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="ax-body text-sm font-medium text-text">
                  {i + 1}. {action.title}
                </span>
                <span className="ax-mono rounded-md bg-success-bg px-1.5 py-0.5 text-xs font-medium text-success">
                  +{formatCurrency(action.estimatedImpact)}
                </span>
              </div>
              <p className="ax-caption">{action.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
        <p className="ax-body text-sm text-tx-secondary">
          Potencial total de recuperação:{' '}
          <strong className="text-primary text-lg">{formatCurrency(totalImpact)}/mês</strong>
        </p>
      </div>
    </div>
  )
}
