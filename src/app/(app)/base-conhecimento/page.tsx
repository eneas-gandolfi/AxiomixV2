/**
 * Arquivo: src/app/(app)/base-conhecimento/page.tsx
 * Proposito: Pagina da Base de Conhecimento (RAG) — upload de PDFs e chat.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import type React from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layouts/page-container";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { KnowledgeBaseModule } from "@/components/rag/knowledge-base-module";

export default async function BaseConhecimentoPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  return (
    <div style={{ '--module-color': '#7C3AED', '--module-color-bg': '#F3EEFF' } as React.CSSProperties}>
      <PageContainer
        title="Base de Conhecimento"
        description="Envie catalogos, playbooks, FAQs e materiais tecnicos para orientar a IA nas analises de conversas do WhatsApp."
      >
        <KnowledgeBaseModule companyId={companyId} />
      </PageContainer>
    </div>
  );
}
