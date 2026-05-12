/**
 * Arquivo: src/app/(app)/dashboard/demo/shopping/page.tsx
 * Propósito: Painel do Shopping (demo) — visão consolidada para dono do shopping
 */

import {
  DEMO_SHOPPING_NAME,
  DEMO_SHOPPING_CITY,
  DEMO_SHOPPING_KPIS,
  DEMO_STORES,
  DEMO_CATEGORY_SUMMARIES,
  DEMO_COMMON_PROBLEMS,
  RECOVERY_FACTORS,
  SHOPPING_RESPONSE_TARGET_MIN,
} from '@/lib/demo/fashion-center-data'
import { DemoBanner } from '@/components/dashboard/demo-banner'
import { ShoppingKpiRow } from '@/components/dashboard/parent/shopping-kpi-row'
import { CategorySummaryCards } from '@/components/dashboard/parent/category-summary-cards'
import { StoreRankingTable } from '@/components/dashboard/parent/store-ranking-table'
import { CommonProblemsChart } from '@/components/dashboard/parent/common-problems-chart'
import { DecisionAxis } from '@/components/ui/decision-axis'

// Saudação depende de horário; renderização precisa ser dinâmica para refletir a hora atual.
export const dynamic = 'force-dynamic'

function getGreeting(): string {
  // Usa Intl.DateTimeFormat para extrair a hora no fuso de São Paulo de forma robusta
  // (sem reparsear string locale, que falha em runtimes sem ICU completo).
  // `hourCycle: 'h23'` garante 00-23 em runtimes que retornariam '24' à meia-noite.
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
  const parsed = Number.parseInt(hourStr, 10)
  if (!Number.isFinite(parsed)) return 'Olá'
  const hour = parsed === 24 ? 0 : parsed
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// Todas as categorias presentes nos dados — usuário pode isolar até as menores
// (a tabela tem empty state e pré-visualiza por contagem na descrição do filtro).
const tableCategories = DEMO_CATEGORY_SUMMARIES.map(({ category }) => category)

export default function DemoShoppingPage() {
  const kpis = DEMO_SHOPPING_KPIS
  const greeting = getGreeting()

  return (
    <div className="dashboard-stage">
      {/* Header mesh */}
      <div className="dashboard-mesh rounded-b-[28px] px-4 pb-6 pt-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <DemoBanner className="mb-4" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {/* Greeting + summary */}
            <div className="flex flex-col gap-1.5">
              <h1 className="ax-t1 text-text">
                {greeting}, {DEMO_SHOPPING_NAME}.
              </h1>
              <p className="ax-body max-w-xl text-tx-secondary">
                Aqui está o resumo do{' '}
                <strong className="text-text">{DEMO_SHOPPING_NAME}</strong>
                {' '}— {DEMO_SHOPPING_CITY}.{' '}
                {kpis.totalLeadsCold > 0 && (
                  <>
                    Suas lojas têm{' '}
                    <strong className="text-warning">{kpis.totalLeadsCold} leads esfriando</strong>
                    {' '}com aproximadamente{' '}
                    <strong className="text-danger">
                      {formatCurrency(kpis.totalRevenueAtRisk)}
                    </strong>
                    {' '}em receita em risco este mês.
                  </>
                )}
              </p>
            </div>

            {/* AI Insight */}
            <div className="w-full lg:max-w-xs">
              <DecisionAxis active animated>
                <div className="flex flex-col gap-1 py-1">
                  <span className="section-label">Insight prioritário</span>
                  <p className="ax-body text-sm text-text">
                    {DEMO_COMMON_PROBLEMS[0].percentage}% dos leads perdidos são por{' '}
                    <strong>demora na 1ª resposta</strong>. Se o shopping reduzir o tempo médio
                    de{' '}
                    <span className="ax-mono text-danger">{kpis.avgResponseTimeMin}min</span> para{' '}
                    <span className="ax-mono text-success">{SHOPPING_RESPONSE_TARGET_MIN}min</span>,
                    a estimativa de recuperação é{' '}
                    <strong className="text-primary">
                      {formatCurrency(Math.round(kpis.totalRevenueAtRisk * RECOVERY_FACTORS.shopping))}
                    </strong>
                    /mês.
                  </p>
                </div>
              </DecisionAxis>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-5">
            <ShoppingKpiRow
              totalConversations={kpis.totalConversations}
              totalLeadsCold={kpis.totalLeadsCold}
              totalRevenueAtRisk={kpis.totalRevenueAtRisk}
              storesConnected={kpis.storesConnected}
              storesTotal={kpis.storesTotal}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6">
          {/* Section: Category summary */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="section-label">Visão por categoria</span>
            </div>
            <CategorySummaryCards categories={DEMO_CATEGORY_SUMMARIES} />
          </div>

          {/* Section: Store ranking + Common problems */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <StoreRankingTable
                stores={DEMO_STORES}
                categories={tableCategories}
                drillDownBasePath="/dashboard/demo/loja"
              />
            </div>
            <div>
              <CommonProblemsChart problems={DEMO_COMMON_PROBLEMS} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
