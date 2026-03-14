/**
 * Arquivo: src/app/aprovacao/[token]/page.tsx
 * Propósito: Página pública de aprovação de conteúdo via link externo (sem autenticação).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { DemandApprovalPage } from "@/components/social/demand-approval-page";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function AprovacaoPage({ params }: PageProps) {
  const { token } = await params;

  return <DemandApprovalPage token={token} />;
}
