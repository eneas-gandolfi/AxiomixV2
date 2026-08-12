/**
 * Arquivo: src/app/(app)/dashboard/page.tsx
 * Propósito: Página principal do dashboard — hub de inteligência de negócio.
 *
 *            Estratégia de carregamento (Fase 1 reorg — 2026-05-13):
 *            - Bootstrap (auth + membership + company) via RPC unica
 *              `dashboard_bootstrap` — 1 round-trip em vez de 3 sequenciais.
 *            - Header funcional (~56px) renderiza imediatamente.
 *            - NextAction é o novo herói — topo absoluto após o header,
 *              responde a pergunta #1 do gestor ("tem alguém sem resposta?").
 *            - Cada bloco abaixo carrega num Suspense próprio. Stalled é
 *              compartilhado entre hero/insights e "Próxima ação" via
 *              React.cache. Sidebar e RiskControl compartilham os fetches
 *              de alertas via `getDashboardAlertsData`.
 * Autor: AXIOMIX
 * Data: 2026-05-13 (Fase 1 — reorg mobile-first)
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardCommandCenterSection } from "@/components/dashboard/dashboard-command-center-section";
import { DashboardCommandCenterSkeleton } from "@/components/dashboard/dashboard-command-center-skeleton";
import { getDashboardBootstrap } from "@/lib/dashboard/bootstrap";

function getGreeting(): string {
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hour = brTime.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const bootstrap = await getDashboardBootstrap();

  if (bootstrap.kind === "unauthenticated") {
    redirect("/login");
  }
  if (bootstrap.kind === "no-company") {
    redirect("/onboarding");
  }

  const { companyId, companyName } = bootstrap;
  const greeting = getGreeting();

  return (
    <main className="dashboard-stage w-full">
      <Suspense fallback={<DashboardCommandCenterSkeleton />}>
        <DashboardCommandCenterSection
          companyId={companyId}
          companyName={companyName}
          greeting={greeting}
        />
      </Suspense>
    </main>
  );
}
