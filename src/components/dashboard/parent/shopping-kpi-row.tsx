/**
 * Arquivo: src/components/dashboard/parent/shopping-kpi-row.tsx
 * Propósito: 4 KPIs agregados do shopping (Conversas, Leads esfriando, Receita em risco, Lojas)
 */

'use client'

import { MessageSquare, ThermometerSun, DollarSign, Store } from 'lucide-react'
import { useAnimatedValue } from '@/lib/hooks/use-animated-value'
import { cn } from '@/lib/utils'

type KpiItem = {
  label: string
  value: number
  icon: React.ReactNode
  format: 'number' | 'currency' | 'fraction'
  fractionTotal?: number
  color: string
  bgColor: string
}

type ShoppingKpiRowProps = {
  totalConversations: number
  totalLeadsCold: number
  totalRevenueAtRisk: number
  storesConnected: number
  storesTotal: number
}

function formatCurrency(value: number): string {
  // Alinhado com `CategorySummaryCards`: threshold 10k para evitar salto "R$ 999" → "R$ 1,0k".
  if (value >= 10000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`
  }
  return `R$ ${value.toLocaleString('pt-BR')}`
}

function KpiCard({
  item,
  index,
}: {
  item: KpiItem
  index: number
}) {
  const animated = useAnimatedValue(item.value)

  return (
    <div
      className={cn(
        'dashboard-panel relative flex flex-col gap-1.5 rounded-2xl p-4',
        'transition-shadow duration-200',
        'opacity-0 animate-ax-cascade',
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="ax-kpi-label">{item.label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: item.bgColor }}
        >
          <span style={{ color: item.color }}>{item.icon}</span>
        </div>
      </div>

      <div className="ax-kpi" style={{ color: 'var(--color-text)' }}>
        {item.format === 'currency'
          ? formatCurrency(animated)
          : item.format === 'fraction'
            ? `${animated}/${item.fractionTotal}`
            : animated.toLocaleString('pt-BR')}
      </div>
    </div>
  )
}

export function ShoppingKpiRow({
  totalConversations,
  totalLeadsCold,
  totalRevenueAtRisk,
  storesConnected,
  storesTotal,
}: ShoppingKpiRowProps) {
  const kpis: KpiItem[] = [
    {
      label: 'Conversas no mês',
      value: totalConversations,
      icon: <MessageSquare size={16} />,
      format: 'number',
      color: 'var(--color-info)',
      bgColor: 'var(--color-info-bg)',
    },
    {
      label: 'Leads esfriando',
      value: totalLeadsCold,
      icon: <ThermometerSun size={16} />,
      format: 'number',
      color: 'var(--color-warning)',
      bgColor: 'var(--color-warning-bg)',
    },
    {
      label: 'Receita em risco',
      value: totalRevenueAtRisk,
      icon: <DollarSign size={16} />,
      format: 'currency',
      color: 'var(--color-danger)',
      bgColor: 'var(--color-danger-bg)',
    },
    {
      label: 'Lojas conectadas',
      value: storesConnected,
      icon: <Store size={16} />,
      format: 'fraction',
      fractionTotal: storesTotal,
      color: 'var(--color-success)',
      bgColor: 'var(--color-success-bg)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((item, i) => (
        <KpiCard key={item.label} item={item} index={i} />
      ))}
    </div>
  )
}
