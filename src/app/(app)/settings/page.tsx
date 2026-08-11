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
import { resolveSettingsIntegrationFlags } from "@/components/settings/settings-status";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  const connectParam = typeof params.connect === "string" ? params.connect : undefined;
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

  const [companyResult, integrationsResult, activeGroupsResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, niche, logo_url, created_at")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("integrations")
      .select("type, is_active, config")
      .eq("company_id", companyId),
    supabase
      .from("group_agent_configs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("is_hidden", false),
  ]);

  const company = companyResult.data;
  const integrations = integrationsResult.data;
  const integrationFlags = resolveSettingsIntegrationFlags(integrations);

  const companyConfigured = Boolean(company?.name && company?.niche);

  const initialStats = {
    companyConfigured,
    integrationsActive: integrationFlags.activeIntegrations,
    totalIntegrations: integrationFlags.totalIntegrations,
    evoCrmActive: integrationFlags.evoCrmActive,
    evolutionApiActive: integrationFlags.evolutionApiActive,
    groupAgentReady: (activeGroupsResult.count ?? 0) > 0,
    lastUpdate: company?.created_at ?? null,
  };

  return (
    <div style={{ '--module-color-bg': 'var(--module-accent-bg, #F7F8FA)' } as React.CSSProperties}>
      <PageContainer title="" description="">
        <SettingsLayout
          companyId={companyId}
          initialStats={initialStats}
          initialTab={tabParam}
          initialIntegration={connectParam}
          userRole={userRole as "owner" | "admin" | "member"}
        />
      </PageContainer>
    </div>
  );
}
