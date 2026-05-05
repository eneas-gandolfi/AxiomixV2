/**
 * Arquivo: src/components/dashboard/insights-panel.tsx
 * Propósito: Painel de insights priorizados do dashboard global. Renderiza N
 *            cards do registry; quando vazio mostra empty state "Tudo em dia".
 *            Severidade do card herda do Insight (red > amber > info).
 *
 *            NOMENCLATURA: este componente é **dashboard-specific** e não
 *            colide com `src/components/ui/insight-card.tsx` (uso geral).
 *            O card individual mora aqui pra evitar dependência circular.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/dashboard/insights/types";

export interface InsightsPanelProps {
  insights: Insight[];
  /** Quando true, mostra estado vazio com texto de calibragem (semana 1). */
  isCalibrating?: boolean;
  className?: string;
}

export function InsightsPanel({
  insights,
  isCalibrating = false,
  className,
}: InsightsPanelProps) {
  if (insights.length === 0) {
    return <EmptyInsight isCalibrating={isCalibrating} className={className} />;
  }

  return (
    <div
      data-testid="insights-panel"
      className={cn("flex h-full flex-col gap-3", className)}
    >
      {insights.map((insight) => (
        <DashboardInsightCard key={insight.ruleId} insight={insight} />
      ))}
    </div>
  );
}

function DashboardInsightCard({ insight }: { insight: Insight }) {
  const accent = severityAccent(insight.severity);

  return (
    <div
      data-testid="dashboard-insight-card"
      data-severity={insight.severity}
      className={cn(
        "dashboard-panel relative flex flex-1 flex-col gap-3 rounded-[20px] border-l-[3px] p-5",
        accent.borderClass,
      )}
    >
      <div className="inline-flex items-center gap-2 self-start rounded-full bg-[rgb(var(--color-primary-rgb)/0.10)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Insight prioritário
      </div>

      <h3 className="ax-t2">{insight.title}</h3>
      <p className="ax-body text-[var(--color-text-secondary)]">
        {insight.body}
      </p>

      <div className="mt-auto flex items-center justify-end border-t border-[var(--color-border)] pt-3">
        <Link
          href={insight.ctaHref}
          data-rule-id={insight.ruleId}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          {insight.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function EmptyInsight({
  isCalibrating,
  className,
}: {
  isCalibrating: boolean;
  className?: string;
}) {
  return (
    <div
      data-testid="insights-panel-empty"
      data-state={isCalibrating ? "calibrating" : "idle"}
      className={cn(
        "dashboard-panel flex h-full flex-col gap-2 rounded-[20px] border-l-[3px] border-l-[var(--color-success)] p-5",
        className,
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-success)]">
        Controle de risco
      </span>
      <h3 className="ax-t2">
        {isCalibrating ? "Ainda aprendendo o ritmo da sua loja" : "Tudo em dia"}
      </h3>
      <p className="ax-body text-[var(--color-text-secondary)]">
        {isCalibrating
          ? "Nos próximos 7 dias coletamos baseline. Volte amanhã pra ver os primeiros sinais."
          : "Nenhum alerta crítico ativo. Sistema saudável, nada exigindo sua intervenção."}
      </p>
    </div>
  );
}

type SeverityAccent = { borderClass: string };

export function severityAccent(severity: Insight["severity"]): SeverityAccent {
  switch (severity) {
    case "red":
      return { borderClass: "border-l-[var(--color-danger)]" };
    case "amber":
      return { borderClass: "border-l-[var(--color-warning)]" };
    default:
      return { borderClass: "border-l-[var(--color-primary)]" };
  }
}
