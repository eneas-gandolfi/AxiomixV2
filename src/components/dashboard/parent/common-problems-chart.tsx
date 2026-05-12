/**
 * Arquivo: src/components/dashboard/parent/common-problems-chart.tsx
 * Propósito: Barras horizontais dos problemas mais comuns do shopping
 */

'use client'

import type { CommonProblem } from '@/lib/demo/fashion-center-data'

type CommonProblemsChartProps = {
  problems: CommonProblem[]
}

export function CommonProblemsChart({ problems }: CommonProblemsChartProps) {
  return (
    <div
      className="rounded-2xl border border-border/70 bg-surface p-4 shadow-[var(--ax-shadow-md)] opacity-0 animate-ax-cascade"
      style={{ animationDelay: '500ms' }}
    >
      <h3 className="ax-t3 mb-3 text-text">Problemas mais comuns</h3>
      <p className="ax-caption mb-4">Diagnóstico agregado de todas as lojas</p>

      <div className="flex flex-col gap-3">
        {problems.map((problem) => (
          <div key={problem.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="ax-body text-sm text-text">{problem.label}</span>
              <span className="ax-mono text-sm font-medium" style={{ color: problem.color }}>
                {problem.percentage}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${problem.percentage}%`,
                  backgroundColor: problem.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
