/**
 * Arquivo: src/app/(app)/campanhas/page.tsx
 * Propósito: Pagina de listagem de campanhas em massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { redirect } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { listCampaigns } from "@/services/campaigns/manager";
import { CampaignsListClient } from "@/components/campaigns/campaigns-list-client";

export default async function CampanhasPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const { campaigns, total } = await listCampaigns(companyId, 1, 20);

  return (
    <CampaignsListClient
      companyId={companyId}
      initialCampaigns={campaigns}
      initialTotal={total}
    />
  );
}
