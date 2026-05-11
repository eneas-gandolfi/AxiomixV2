/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/layout.tsx
 * Propósito: Layout compartilhado do módulo WhatsApp Intelligence com navegação por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { WhatsAppModuleNav } from "@/components/whatsapp/whatsapp-module-nav";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { CompanyIdProvider } from "@/lib/contexts/company-id-context";

export default async function WhatsAppIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  return (
    <CompanyIdProvider companyId={companyId}>
      <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F0FDFA)' } as React.CSSProperties}>
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="ax-t1 text-xl md:text-2xl">
                Inteligência
              </h1>
              <p className="mt-1 ax-body text-[var(--color-text-secondary)]">
                Painel ao vivo, histórico de IA e conversas do WhatsApp.
              </p>
            </div>
            <Link
              href="/whatsapp-intelligence/sessoes"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Configurar
            </Link>
          </header>

          <WhatsAppModuleNav />

          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </CompanyIdProvider>
  );
}
