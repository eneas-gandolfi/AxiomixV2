/**
 * Arquivo: src/app/(app)/campanhas/nova/page.tsx
 * Propósito: Pagina de criacao de nova campanha em massa (wizard multi-step).
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { redirect } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";

export default async function NovaCampanhaPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  return <CampaignWizard companyId={companyId} />;
}
