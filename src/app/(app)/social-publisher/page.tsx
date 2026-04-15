/**
 * Arquivo: src/app/(app)/social-publisher/page.tsx
 * Propósito: Renderizar modulo Social Publisher com formulario e historico paginado.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { redirect } from "next/navigation";
import { SocialPublisherDashboard } from "@/components/social/social-publisher-dashboard";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { getCompanyTimezone } from "@/lib/social/get-company-timezone";
import { listScheduledPosts } from "@/services/social/publisher";

export default async function SocialPublisherPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const [initialHistory, companyTimezone] = await Promise.all([
    listScheduledPosts({ companyId, page: 1, pageSize: 20 }),
    getCompanyTimezone(companyId),
  ]);

  return (
    <SocialPublisherDashboard
      companyId={companyId}
      initialHistory={initialHistory}
      companyTimezone={companyTimezone}
    />
  );
}
