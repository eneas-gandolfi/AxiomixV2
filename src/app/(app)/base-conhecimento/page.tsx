/**
 * Arquivo: src/app/(app)/base-conhecimento/page.tsx
 * Propósito: Pagina da Base de Conhecimento (RAG) — upload de PDFs e chat.
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
    <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F5F3FF)' } as React.CSSProperties}>
      <PageContainer
        title="Base de Conhecimento"
        description="Alimente a IA com o contexto do seu negócio — ela aprende, você valida."
      >
        <KnowledgeBaseModule companyId={companyId} />
      </PageContainer>
    </div>
  );
}
