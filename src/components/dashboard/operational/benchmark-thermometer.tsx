/**
 * Arquivo: src/components/dashboard/operational/benchmark-thermometer.tsx
 * Propósito: Gauge horizontal comparando a loja com a média do shopping/setor
 */

'use client'

import { cn } from '@/lib/utils'

type BenchmarkItem = {
  label: string
  yourValue: number
  avgValue: number
  unit: string
  invertBetter?: boolean // true = menor é melhor (ex: tempo de resposta)
}

type BenchmarkThermometerProps = {
  items: BenchmarkItem[]
  groupLabel: string
  recoveryEstimate?: number
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`
}

function ThermometerBar({ item }: { item: BenchmarkItem }) {
  const max = Math.max(item.yourValue, item.avgValue) * 1.3
  // Guard contra max === 0 (ambos valores zerados): evita NaN no CSS e estado de "pior" falso.
  const hasData = max > 0
  const yourPct = hasData ? (item.yourValue / max) * 100 : 0
  const avgPct = hasData ? (item.avgValue / max) * 100 : 0
  const isEqual = item.yourValue === item.avgValue
  const isBetter = isEqual
    ? false
    : item.invertBetter
      ? item.yourValue < item.avgValue
      : item.yourValue > item.avgValue
  const yourColor = !hasData || isEqual
    ? 'var(--color-text-tertiary)'
    : isBetter
      ? 'var(--color-success)'
      : 'var(--color-danger)'
  const valueTone = !hasData || isEqual
    ? 'text-tx-secondary'
    : isBetter
      ? 'text-success'
      : 'text-danger'
  const tooltip = `Sua loja: ${item.yourValue}${item.unit} · Média do shopping: ${item.avgValue}${item.unit}`

  return (
    <div className="flex flex-col gap-1.5" title={tooltip}>
      <div className="flex items-center justify-between">
        <span className="ax-body text-sm text-text">{item.label}</span>
        <span className={cn('ax-mono text-sm font-medium', valueTone)}>
          {item.yourValue}{item.unit}
        </span>
      </div>

      <div
        className="relative h-2 w-full rounded-full bg-surface-2"
        role="img"
        aria-label={tooltip}
      >
        {/* Your value */}
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${yourPct}%`, backgroundColor: yourColor }}
        />
        {/* Average marker */}
        <div
          className="absolute top-[-3px] h-[14px] w-[2px] rounded-full bg-tx-secondary"
          style={{ left: `${avgPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="ax-caption">
          Média {item.invertBetter ? '↓' : '↑'} é melhor
        </span>
        <span className="ax-caption">
          Média do shopping: <strong>{item.avgValue}{item.unit}</strong>
        </span>
      </div>
    </div>
  )
}

export function BenchmarkThermometer({
  items,
  groupLabel,
  recoveryEstimate,
}: BenchmarkThermometerProps) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface p-4 shadow-[var(--ax-shadow-md)] opacity-0 animate-ax-cascade"
      style={{ animationDelay: '300ms' }}
    >
      <h3 className="ax-t3 mb-1 text-text">Como você se compara</h3>
      <p className="ax-caption mb-4">Benchmark vs. média do {groupLabel}</p>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <ThermometerBar key={item.label} item={item} />
        ))}
      </div>

      {typeof recoveryEstimate === 'number' && Number.isFinite(recoveryEstimate) && recoveryEstimate > 0 && (
        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3">
          <p className="ax-body text-sm text-tx-secondary">
            💡 Se igualar à média do shopping, você pode recuperar aproximadamente{' '}
            <strong className="text-primary">{formatCurrency(recoveryEstimate)}/mês</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
