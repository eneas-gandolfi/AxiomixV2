/**
 * Arquivo: src/app/(app)/dashboard/demo/loja/[storeId]/page.tsx
 * Propósito: Painel da Loja (demo) — visão operacional individual
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageSquare, Percent, Clock, RotateCcw } from 'lucide-react'
import {
  getDemoStore,
  getDemoColdLeads,
  getDemoWeeklyActions,
  getShoppingBenchmark,
  DEMO_SHOPPING_NAME,
  RECOVERY_FACTORS,
} from '@/lib/demo/fashion-center-data'
import { DemoBanner } from '@/components/dashboard/demo-banner'
import { HeroRevenueBanner } from '@/components/dashboard/operational/hero-revenue-banner'
import { BenchmarkThermometer } from '@/components/dashboard/operational/benchmark-thermometer'
import { ColdLeadCard } from '@/components/dashboard/operational/cold-lead-card'
import { WeeklyActionPlan } from '@/components/dashboard/operational/weekly-action-plan'

// Cold leads são datados por request (`Date.now()` em `generateColdLeads`); render
// estático congelaria essas datas. Consistente com `/demo/shopping/page.tsx`.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ storeId: string }>
}

export default async function DemoStoreDetailPage({ params }: Props) {
  const { storeId } = await params
  const store = getDemoStore(storeId)

  if (!store) notFound()

  const coldLeads = getDemoColdLeads(storeId)
  const weeklyActions = getDemoWeeklyActions(storeId)
  const benchmark = getShoppingBenchmark()
  const m = store.metrics

  return (
    <div className="dashboard-stage">
      {/* Header mesh */}
      <div className="dashboard-mesh rounded-b-[28px] px-4 pb-6 pt-5 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <DemoBanner className="mb-4" />

          {/* Breadcrumb back */}
          <Link
            href="/dashboard/demo/shopping"
            className="mb-3 inline-flex items-center gap-1.5 ax-body text-sm text-tx-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao {DEMO_SHOPPING_NAME}
          </Link>

          {/* Store header */}
          <div className="flex flex-col gap-1">
            <h1 className="ax-t1 text-text">{store.name}</h1>
            <p className="ax-caption">
              {store.categories.join(' · ')}
              {store.instagram && (
                <span className="ml-2 text-primary">{store.instagram}</span>
              )}
            </p>
          </div>

          {/* Hero revenue banner */}
          <div className="mt-5">
            <HeroRevenueBanner
              revenueAtRisk={m.revenueAtRisk}
              leadsGoingCold={m.leadsGoingCold}
              viewLeadsHref="#cold-leads"
            />
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Conversas no mês',
                value: m.conversationsMonth,
                icon: <MessageSquare size={14} />,
                suffix: '',
              },
              {
                label: 'Taxa de resposta',
                value: m.responseRate,
                icon: <Percent size={14} />,
                suffix: '%',
              },
              {
                label: 'Tempo 1ª resposta',
                value: m.avgFirstResponseMin,
                icon: <Clock size={14} />,
                suffix: 'min',
              },
              {
                label: 'Follow-ups feitos',
                value: m.followUpRate,
                icon: <RotateCcw size={14} />,
                suffix: '%',
              },
            ].map((kpi, i) => (
              <div
                key={kpi.label}
                className="dashboard-panel flex flex-col gap-1.5 rounded-2xl p-3 opacity-0 animate-ax-cascade"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-tx-tertiary">{kpi.icon}</span>
                  <span className="ax-kpi-label">{kpi.label}</span>
                </div>
                <span className="ax-kpi text-2xl text-text">
                  {kpi.value.toLocaleString('pt-BR')}{kpi.suffix}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6">
          {/* Benchmark */}
          <BenchmarkThermometer
            groupLabel={DEMO_SHOPPING_NAME}
            items={[
              {
                label: 'Taxa de resposta',
                yourValue: m.responseRate,
                avgValue: benchmark.avgResponseRate,
                unit: '%',
              },
              {
                label: 'Tempo de 1ª resposta',
                yourValue: m.avgFirstResponseMin,
                avgValue: benchmark.avgFirstResponseMin,
                unit: 'min',
                invertBetter: true,
              },
              {
                label: 'Taxa de follow-up',
                yourValue: m.followUpRate,
                avgValue: benchmark.avgFollowUpRate,
                unit: '%',
              },
            ]}
            recoveryEstimate={Math.round(m.revenueAtRisk * RECOVERY_FACTORS.perStore)}
          />

          {/* Cold leads */}
          <div id="cold-leads" className="scroll-mt-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="section-label">Leads que esfriaram</span>
              <span className="ax-mono rounded-md bg-danger-bg px-1.5 py-0.5 text-xs font-medium text-danger">
                {m.leadsGoingCold}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {coldLeads.map((lead, i) => (
                <ColdLeadCard key={lead.id} lead={lead} index={i} />
              ))}
            </div>
            {m.leadsGoingCold > coldLeads.length && (
              <p className="ax-caption mt-3 text-center">
                + {(m.leadsGoingCold - coldLeads.length).toLocaleString('pt-BR')} outros leads esfriando neste mês
              </p>
            )}
          </div>

          {/* Weekly action plan */}
          <WeeklyActionPlan actions={weeklyActions} />
        </div>
      </div>
    </div>
  )
}
