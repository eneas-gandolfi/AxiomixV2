/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/layout.tsx
 * Propósito: Layout compartilhado do módulo WhatsApp Intelligence com navegação por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type React from "react";
import { WhatsAppModuleNav } from "@/components/whatsapp/whatsapp-module-nav";

export default function WhatsAppIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ '--module-color': '#2EC4B6', '--module-color-bg': '#E0FAF7' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-display text-xl font-bold text-[var(--color-text)] md:text-2xl">
            WhatsApp Intelligence
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Sincronize, analise e priorize oportunidades de atendimento.
          </p>
        </header>

        <WhatsAppModuleNav />

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
