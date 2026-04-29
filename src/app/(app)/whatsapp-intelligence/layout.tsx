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
    <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F0FDFA)' } as React.CSSProperties}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="ax-t1 text-xl md:text-2xl">
            WhatsApp Intelligence
          </h1>
          <p className="mt-1 ax-body text-[var(--color-text-secondary)]">
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
