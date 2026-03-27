/**
 * Arquivo: src/app/(app)/campanhas/layout.tsx
 * Propósito: Layout compartilhado do modulo Campanhas em Massa com navegacao por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import type React from "react";
import { CampaignsModuleNav } from "@/components/campaigns/campaigns-module-nav";

export const dynamic = "force-dynamic";

export default function CampanhasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ '--module-color': '#25D366', '--module-color-bg': '#E8F8EE' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-display text-xl font-bold text-[var(--color-text)] md:text-2xl">
            Campanhas em Massa
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Envie templates WhatsApp para seus contatos em escala.
          </p>
        </header>

        <CampaignsModuleNav />

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
