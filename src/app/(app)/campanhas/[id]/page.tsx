/**
 * Arquivo: src/app/(app)/campanhas/[id]/page.tsx
 * Propósito: Pagina de detalhe de campanha com progresso e tabela de recipients.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { redirect, notFound } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { getCampaign } from "@/services/campaigns/manager";
import { listRecipients } from "@/services/campaigns/recipient-generator";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaign(id, companyId);
  } catch {
    notFound();
  }

  const { recipients, total } = await listRecipients(id, 1, 20);

  return (
    <CampaignDetailClient
      companyId={companyId}
      initialCampaign={campaign}
      initialRecipients={recipients}
      initialRecipientsTotal={total}
    />
  );
}
