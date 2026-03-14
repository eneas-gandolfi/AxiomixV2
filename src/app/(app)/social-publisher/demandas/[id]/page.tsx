/**
 * Arquivo: src/app/(app)/social-publisher/demandas/[id]/page.tsx
 * Propósito: Página de detalhe de uma demanda de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { DemandDetailClient } from "@/components/social/demand-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DemandDetailPage({ params }: PageProps) {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const { id } = await params;

  return (
    <DemandDetailClient demandId={id} companyId={companyId} />
  );
}
