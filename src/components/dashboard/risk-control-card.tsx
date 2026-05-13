/**
 * Arquivo: src/components/dashboard/risk-control-card.tsx
 * Propósito: 3º card do tríptico de KPIs — Controle de Risco. Mostra contagem
 *            de alertas críticos (conversas negativas sem resolver + integrações
 *            com erro + posts falhos) em formato KPI compacto: número-herói +
 *            narrativa + CTA.
 *
 *            Fonte unica de verdade: `getDashboardAlertsData` (React.cache),
 *            compartilhada com DashboardSidebarSection — sem queries duplicadas.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardAlertsData } from "@/lib/dashboard/shared-queries";

export async function RiskControlCard({ companyId }: { companyId: string }) {
  const data = await getDashboardAlertsData(companyId);

  const totalAlerts =
    data.unresolvedNegativeCount + data.integrationsWithErrorCount + data.failedPostsCount;

  const isOk = totalAlerts === 0;

  // Empty state: versão compacta. Check verde + 1 linha de status. Sem
  // número gigante "0" verde que dominava a tela quando nada ia mal.
  if (isOk) {
    return (
      <article
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-border bg-card p-4",
          "opacity-0 animate-ax-cascade delay-300 shadow-card-modern",
        )}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-light">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="section-label">Controle de risco</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--color-text)]">
            Tudo em dia · 0 alertas críticos
          </p>
        </div>
      </article>
    );
  }

  // Alert state: mantém visual de destaque com número + narrative + CTA.
  const narrative = buildNarrative(
    data.unresolvedNegativeCount,
    data.integrationsWithErrorCount,
    data.failedPostsCount,
  );

  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 transition-all duration-200 sm:p-5",
        "opacity-0 animate-ax-cascade",
        "border-border shadow-card-modern hover:-translate-y-0.5 hover:shadow-card-hover-modern",
        "delay-300",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="section-label">Controle de risco</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-danger-light">
          <ShieldCheck className="h-4 w-4 text-danger" aria-hidden="true" />
        </span>
      </div>

      <p className="ax-metric-lg text-[var(--color-danger)]">{totalAlerts}</p>

      <div className="mt-2">
        <span className="text-xs text-muted">
          {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"} ativos
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{narrative}</p>

      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/whatsapp-intelligence"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Ver alertas
          <ArrowRight className="h-[11px] w-[11px]" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function buildNarrative(
  unresolvedNegative: number,
  integrationsError: number,
  failedPosts: number,
): string {
  const parts: string[] = [];
  if (unresolvedNegative > 0) {
    parts.push(
      `${unresolvedNegative} ${unresolvedNegative === 1 ? "conversa negativa" : "conversas negativas"} sem resolução`,
    );
  }
  if (integrationsError > 0) {
    parts.push(
      `${integrationsError} ${integrationsError === 1 ? "integração com erro" : "integrações com erro"}`,
    );
  }
  if (failedPosts > 0) {
    parts.push(
      `${failedPosts} ${failedPosts === 1 ? "post falhou" : "posts falharam"} esta semana`,
    );
  }
  return parts.join(" · ") + ".";
}
