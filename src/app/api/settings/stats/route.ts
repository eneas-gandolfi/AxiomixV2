/**
 * Arquivo: src/app/api/settings/stats/route.ts
 * Propósito: Retornar estatísticas de configuração para dashboard
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type { UploadPostConfig } from "@/lib/integrations/types";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function decodeUploadPostFallback(config: unknown): UploadPostConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return {};
  }

  const raw = config as Record<string, unknown>;
  const rawConnections = Array.isArray(raw.social_connections)
    ? raw.social_connections
    : Array.isArray(raw.socialConnections)
      ? raw.socialConnections
      : [];

  return {
    socialConnections: rawConnections
      .map((entry) => {
        if (typeof entry !== "object" || entry === null) return null;
        const conn = entry as Record<string, unknown>;
        const platform = conn.platform;
        if (platform !== "instagram" && platform !== "linkedin" && platform !== "tiktok") {
          return null;
        }
        return {
          id: typeof conn.id === "string" ? conn.id : crypto.randomUUID(),
          platform: platform as "instagram" | "linkedin" | "tiktok",
          status: (conn.status === "connected" || conn.status === "error" || conn.status === "pending"
            ? conn.status
            : "pending") as "connected" | "error" | "pending",
          externalConnectionId: null,
          accountName: null,
          connectUrl: null,
          connectedAt: null,
          lastError: null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  };
}

function decodeUploadPost(config: unknown): UploadPostConfig {
  try {
    return decodeIntegrationConfig("upload_post", config as never);
  } catch {
    return decodeUploadPostFallback(config);
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    // Fetch company data
    const { data: company } = await supabase
      .from("companies")
      .select("id, name, niche, logo_url, created_at")
      .eq("id", access.companyId)
      .maybeSingle();

    // Fetch integrations
    const { data: integrations } = await supabase
      .from("integrations")
      .select("type, is_active, config")
      .eq("company_id", access.companyId);

    // Count active integrations
    const activeIntegrations = integrations?.filter((i) => i.is_active).length ?? 0;
    const totalIntegrations = integrations?.length ?? 0;

    // Count social connections
    const uploadPostIntegration = integrations?.find((i) => i.type === "upload_post");
    let socialConnections = 0;

    if (uploadPostIntegration?.config) {
      const decoded = decodeUploadPost(uploadPostIntegration.config);
      socialConnections = decoded.socialConnections?.filter((c) => c.status === "connected").length ?? 0;
    }

    const totalSocialPlatforms = 3; // Instagram, LinkedIn, TikTok

    // Company is configured if it has name and niche
    const companyConfigured = Boolean(company?.name && company?.niche);

    return NextResponse.json({
      companyConfigured,
      socialConnections,
      totalSocialPlatforms,
      integrationsActive: activeIntegrations,
      totalIntegrations,
      lastUpdate: company?.created_at ?? null,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "SETTINGS_STATS_ERROR" },
      { status: 500 }
    );
  }
}
