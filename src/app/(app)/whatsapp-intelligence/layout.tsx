/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/layout.tsx
 * Propósito: Layout compartilhado do módulo WhatsApp Intelligence com navegação por abas.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type React from "react";
import { redirect } from "next/navigation";
import { WhatsAppModuleHeader } from "@/components/whatsapp/whatsapp-module-header";
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
          <WhatsAppModuleHeader />
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </CompanyIdProvider>
  );
}
