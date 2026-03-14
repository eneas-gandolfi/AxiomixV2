/**
 * Arquivo: src/app/(app)/social-publisher/demandas/page.tsx
 * Propósito: Página de listagem de demandas de conteúdo (tabela e kanban).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DemandsPageClient } from "@/components/social/demands-page-client";

async function getTeamMembers(companyId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("company_id", companyId);

  const userIds = (memberships ?? [])
    .map((m) => m.user_id)
    .filter((id): id is string => typeof id === "string");

  if (userIds.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds);

  return (users ?? []).map((u) => ({
    id: u.id,
    name: u.full_name ?? u.id,
  }));
}

export default async function DemandasPage() {
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const teamMembers = await getTeamMembers(companyId);

  return (
    <DemandsPageClient companyId={companyId} teamMembers={teamMembers} />
  );
}
