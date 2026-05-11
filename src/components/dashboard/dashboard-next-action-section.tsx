/**
 * Arquivo: src/components/dashboard/dashboard-next-action-section.tsx
 * Proposito: Bloco "Proxima acao recomendada". Streama independente do hero,
 *            mas reusa o mesmo `getStalledConversations` (React.cache) — sem
 *            round-trip duplicado.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { getStalledConversations } from "@/lib/dashboard/shared-queries";

export function DashboardNextActionSkeleton() {
  return (
    <section className="rounded-[20px] border border-border/70 bg-[var(--color-surface-sunken,var(--color-surface-2))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="h-10 w-10 shrink-0 rounded-full bg-info-light" />
        <div className="flex-1 min-w-0">
          <div className="skeleton-shimmer animate-shimmer h-3 w-32 rounded" />
          <div className="skeleton-shimmer animate-shimmer mt-2 h-5 w-3/5 rounded" />
          <div className="skeleton-shimmer animate-shimmer mt-2 h-3 w-2/3 rounded" />
        </div>
      </div>
    </section>
  );
}

export async function DashboardNextActionSection({
  companyId,
}: {
  companyId: string;
}) {
  const stalled = await getStalledConversations(companyId);

  const headline =
    stalled.count > 0 && stalled.items[0]
      ? `Retomar conversa com ${stalled.items[0].customerName}`
      : "Nenhuma ação urgente agora";

  const subline =
    stalled.count > 0
      ? "Coletando padrões de priorização — em ~30 conversas a IA começa a recomendar ações além das paradas."
      : "Sua semana está fluindo. Bom momento pra prospectar ou descansar.";

  return (
    <section className="rounded-[20px] border border-border/70 bg-[var(--color-surface-sunken,var(--color-surface-2))] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-light text-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="section-label">Próxima ação recomendada</p>
          <p className="mt-1 text-base font-semibold text-text sm:text-lg">{headline}</p>
          <p className="mt-1 text-xs italic leading-5 text-muted">{subline}</p>
        </div>
      </div>
    </section>
  );
}
