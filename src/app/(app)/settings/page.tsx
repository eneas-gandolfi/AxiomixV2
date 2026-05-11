/**
 * Arquivo: src/app/(app)/settings/page.tsx
 * Propósito: Página de configurações com layout profissional e tabs.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import type React from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layouts/page-container";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  const companyId = await getUserCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole = "member";
  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();
    userRole = membership?.role ?? "member";
  }

  const [companyResult, integrationsResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, niche, logo_url, created_at")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("integrations")
      .select("type, is_active")
      .eq("company_id", companyId),
  ]);

  const company = companyResult.data;
  const integrations = integrationsResult.data;

  const activeIntegrations = integrations?.filter((i) => i.is_active).length ?? 0;
  const totalIntegrations = 2; // Evo CRM + Evolution API

  const companyConfigured = Boolean(company?.name && company?.niche);

  const initialStats = {
    companyConfigured,
    integrationsActive: activeIntegrations,
    totalIntegrations,
    lastUpdate: company?.created_at ?? null,
  };

  return (
    <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F7F8FA)' } as React.CSSProperties}>
      <PageContainer title="" description="">
        <SettingsLayout
          companyId={companyId}
          initialStats={initialStats}
          initialTab={tabParam}
          userRole={userRole as "owner" | "admin" | "member"}
        />
      </PageContainer>
    </div>
  );
}
