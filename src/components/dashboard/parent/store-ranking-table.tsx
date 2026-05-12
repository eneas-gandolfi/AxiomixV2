/**
 * Arquivo: src/components/dashboard/parent/store-ranking-table.tsx
 * Propósito: Tabela de ranking de lojas com filtro, busca e Top/Bottom
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoStore, StoreCategory } from '@/lib/demo/fashion-center-data'

type SortField = 'name' | 'conversationsMonth' | 'leadsGoingCold' | 'revenueAtRisk' | 'healthScore'
type SortDir = 'asc' | 'desc'

type StoreRankingTableProps = {
  stores: DemoStore[]
  categories: StoreCategory[]
  drillDownBasePath?: string
}

function HealthBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-success bg-success-bg'
      : score >= 45
        ? 'text-warning bg-warning-bg'
        : 'text-danger bg-danger-bg'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            backgroundColor:
              score >= 70
                ? 'var(--color-success)'
                : score >= 45
                  ? 'var(--color-warning)'
                  : 'var(--color-danger)',
          }}
        />
      </div>
      <span className={cn('ax-mono rounded-md px-1.5 py-0.5 text-xs font-medium', color)}>
        {score}%
      </span>
    </div>
  )
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function StoreRankingTable({
  stores,
  categories,
  drillDownBasePath = '/dashboard/demo/loja',
}: StoreRankingTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('healthScore')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showAll, setShowAll] = useState(false)

  // Reset paginação quando filtros mudam — evita estado fantasma "expandido" após limpar busca.
  useEffect(() => {
    setShowAll(false)
  }, [search, categoryFilter])

  const filtered = useMemo(() => {
    let list = [...stores]

    if (categoryFilter !== 'all') {
      list = list.filter((s) => s.categories.includes(categoryFilter as StoreCategory))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      const aVal = sortField === 'name' ? a.name : a.metrics[sortField]
      const bVal = sortField === 'name' ? b.name : b.metrics[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base' })
          : bVal.localeCompare(aVal, 'pt-BR', { sensitivity: 'base' })
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    return list
  }, [stores, categoryFilter, search, sortField, sortDir])

  const displayed = showAll ? filtered : filtered.slice(0, 10)
  const hasMore = filtered.length > 10

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-tx-tertiary" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />
  }

  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface shadow-[var(--ax-shadow-md)] opacity-0 animate-ax-cascade"
      style={{ animationDelay: '400ms' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="section-label">Performance das lojas</span>
          <h3 className="ax-t2 text-text">Ranking de Lojas</h3>
          <p className="ax-caption">
            {filtered.length} de {stores.length} lojas
            {categoryFilter !== 'all' ? ` em ${categoryFilter}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tx-tertiary" />
            <input
              type="text"
              placeholder="Buscar loja..."
              aria-label="Buscar lojas pelo nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-8 w-40 rounded-lg border border-border bg-surface-2 pl-8 pr-3',
                'ax-body text-sm text-text placeholder:text-tx-tertiary',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20',
              )}
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar lojas por categoria"
            className={cn(
              'h-8 rounded-lg border border-border bg-surface-2 px-2',
              'ax-body text-sm text-text',
              'focus:border-primary focus:outline-none',
            )}
          >
            <option value="all">Todas categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {[
                { field: 'name' as SortField, label: 'Loja' },
                { field: 'conversationsMonth' as SortField, label: 'Conversas' },
                { field: 'leadsGoingCold' as SortField, label: 'Leads frios' },
                { field: 'revenueAtRisk' as SortField, label: 'Receita em risco' },
                { field: 'healthScore' as SortField, label: 'Saúde' },
              ].map(({ field, label }, idx) => {
                const isSorted = sortField === field
                const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                return (
                  <th
                    key={field}
                    aria-sort={ariaSort}
                    className={cn(
                      'px-4 py-2.5 text-left bg-surface',
                      idx === 0 && 'sticky left-0 z-10',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      aria-label={`Ordenar por ${label}`}
                      className="flex items-center gap-1 ax-kpi-label hover:text-text transition-colors"
                    >
                      {label}
                      <SortIcon field={field} />
                    </button>
                  </th>
                )
              })}
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <span className="ax-body text-sm text-tx-secondary">
                    Nenhuma loja encontrada com os filtros atuais.
                  </span>
                </td>
              </tr>
            ) : (
              displayed.map((store) => (
                <tr
                  key={store.id}
                  className="border-b border-border/50 transition-colors hover:bg-surface-2/30"
                >
                  <td
                    className="px-4 py-3 sticky left-0 z-[5] bg-surface"
                  >
                    <div className="flex flex-col">
                      <span className="ax-body font-medium text-text">{store.name}</span>
                      <span className="ax-caption">{store.primaryCategory}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="ax-mono text-sm text-text">
                      {store.metrics.conversationsMonth.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'ax-mono text-sm font-medium',
                      store.metrics.leadsGoingCold > 30 ? 'text-danger' : 'text-warning',
                    )}>
                      {store.metrics.leadsGoingCold.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="ax-mono text-sm font-medium text-danger">
                      {formatCurrency(store.metrics.revenueAtRisk)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <HealthBadge score={store.metrics.healthScore} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${drillDownBasePath}/${store.id}`}
                      aria-label={`Abrir painel da loja ${store.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-2 transition-colors"
                    >
                      <ExternalLink size={14} className="text-tx-tertiary" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="flex items-center justify-center border-t border-border p-3">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="ax-body text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            {showAll
              ? 'Mostrar Top 10'
              : `Ver todas as ${filtered.length} lojas`}
          </button>
        </div>
      )}
    </div>
  )
}
