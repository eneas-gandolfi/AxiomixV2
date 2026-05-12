/**
 * Arquivo: src/components/dashboard/parent/category-summary-cards.tsx
 * Propósito: Cards resumo por categoria com mini heatmap de saúde das lojas
 */

'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { CategorySummary } from '@/lib/demo/fashion-center-data'

type CategorySummaryCardsProps = {
  categories: CategorySummary[]
  onCategoryClick?: (category: string) => void
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'var(--color-success)'
      : score >= 45
        ? 'var(--color-warning)'
        : 'var(--color-danger)'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="ax-mono text-xs" style={{ color }}>
        {score}%
      </span>
    </div>
  )
}

function formatCurrency(value: number): string {
  // Mantém formato BR completo até 10k (4 dígitos ainda legíveis); acima usa "k" compacto.
  // Evita o salto abrupto entre "R$ 999" (sem separador) e "R$ 1,0k".
  if (value >= 10000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`
  }
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function CategorySummaryCards({
  categories,
  onCategoryClick,
}: CategorySummaryCardsProps) {
  const mainCategories = categories
    .filter((c) => c.storeCount >= 3)
    .sort((a, b) => b.storeCount - a.storeCount)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {mainCategories.map((cat, i) => (
        <button
          key={cat.category}
          type="button"
          onClick={() => onCategoryClick?.(cat.category)}
          className={cn(
            'group relative flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 text-left',
            'shadow-[var(--ax-shadow-md)] hover:shadow-[var(--ax-shadow-lg)]',
            'hover:border-[rgb(var(--color-primary-rgb)/0.25)]',
            'transition-all duration-200',
            'opacity-0 animate-ax-cascade',
          )}
          style={{ animationDelay: `${200 + i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <span className="ax-t3 text-text">{cat.category}</span>
            <span className="ax-caption rounded-md bg-surface-2 px-1.5 py-0.5">
              {cat.storeCount} lojas
            </span>
          </div>

          <HealthBar score={cat.avgHealthScore} />

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="ax-caption">Receita em risco</span>
              <span className="ax-mono text-sm font-semibold text-danger">
                {formatCurrency(cat.totalRevenueAtRisk)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="ax-caption">Leads frios</span>
              <span className="ax-mono text-sm font-semibold text-warning">
                {cat.totalLeadsCold}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <div className="flex items-center gap-1">
              <TrendingUp size={12} className="text-success" />
              <span className="ax-caption text-success">{cat.bestStore.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown size={12} className="text-danger" />
              <span className="ax-caption text-danger">{cat.worstStore.name}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
