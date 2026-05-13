/**
 * Arquivo: src/components/dashboard/dashboard-next-action-section.tsx
 * Proposito: Herói laranja focal do dashboard. Responde a pergunta #1 do
 *            gestor: "tem alguém sem resposta?". Visual destacado pra não
 *            deixar dúvida de que é o bloco mais importante da tela.
 *            Reusa `getStalledConversations` (React.cache) — sem round-trip
 *            duplicado com DashboardHeroSection.
 * Autor: AXIOMIX
 * Data: 2026-05-13 (Fase 2 — redesign herói laranja)
 */

import "server-only";

import Link from "next/link";
import { getStalledConversations } from "@/lib/dashboard/shared-queries";

/** Formata segundos de espera como "Xh" ou "Xm" pra eyebrow do herói. */
function formatWait(seconds: number): string {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 60)}m`;
}

export function DashboardNextActionSkeleton() {
  return (
    <section
      className="min-h-[140px] relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      style={{ background: "var(--color-primary)" }}
      aria-hidden="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="h-11 w-11 shrink-0 rounded-full bg-white/20" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-24 rounded bg-white/25" />
          <div className="h-5 w-3/5 rounded bg-white/30" />
          <div className="h-3 w-2/3 rounded bg-white/20" />
          <div className="mt-2 h-8 w-32 rounded-lg bg-white/25" />
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

  const hasUrgent = stalled.count > 0 && stalled.items[0] != null;
  const topItem = stalled.items[0];

  const eyebrow =
    hasUrgent && topItem
      ? `Sem resposta há +${formatWait(topItem.waitSeconds)}`
      : "Tudo em dia";

  const headline =
    hasUrgent && topItem
      ? `Retomar conversa com ${topItem.customerName}`
      : "Nenhuma ação urgente agora";

  const subline = hasUrgent
    ? stalled.count > 1
      ? `Mais ${stalled.count - 1} conversa${stalled.count - 1 > 1 ? "s" : ""} aguardando resposta.`
      : "Esta é a conversa mais urgente no momento."
    : "Sua semana está fluindo. Bom momento pra prospectar ou descansar.";

  return (
    <section
      className="relative overflow-hidden rounded-[16px] p-5 sm:p-6"
      style={{
        background: hasUrgent
          ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-muted) 100%)"
          : "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        boxShadow:
          "0 6px 24px rgb(var(--color-primary-rgb) / 0.28), 0 2px 6px rgb(var(--color-primary-rgb) / 0.12)",
      }}
    >
      {/* Orbe decorativo de fundo */}
      <span
        className="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,.16) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        {/* Ícone */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
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

        {/* Conteúdo textual */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/80">
            {eyebrow}
          </p>
          <p className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
            {headline}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.4] text-white/80">
            {subline}
          </p>
          {hasUrgent && topItem ? (
            <Link
              href={`/whatsapp-intelligence/conversas/${topItem.conversationId}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              style={{ color: "var(--color-primary-muted)" }}
            >
              {stalled.count > 1
                ? `Abrir ${topItem.customerName}`
                : "Abrir conversa"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
