/**
 * Arquivo: src/app/api/social/connected-platforms/route.ts
 * Propósito: Retornar apenas as plataformas sociais conectadas da empresa
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import type { UploadPostConfig, SocialPlatform, UploadPostSocialConnection } from "@/lib/integrations/types";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConnectedPlatform = {
  platform: "instagram" | "linkedin" | "tiktok" | "facebook";
  accountName: string | null;
};

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
        if (platform !== "instagram" && platform !== "linkedin" && platform !== "tiktok" && platform !== "facebook") {
          return null;
        }

        const status = conn.status;
        const accountName = typeof conn.accountName === "string" ? conn.accountName :
                           typeof conn.account_name === "string" ? conn.account_name : null;

        return {
          id: typeof conn.id === "string" ? conn.id : crypto.randomUUID(),
          platform: platform as SocialPlatform,
          status: (status === "connected" || status === "error" || status === "pending" ? status : "pending") as UploadPostSocialConnection["status"],
          externalConnectionId: null,
          accountName,
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

    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", access.companyId)
      .eq("type", "upload_post")
      .maybeSingle();

    if (!integration?.config) {
      return NextResponse.json({
        connected: [],
        message: "Nenhuma plataforma conectada. Configure em Configurações > Integrações.",
      });
    }

    const decoded = decodeUploadPost(integration.config);
    const connections = decoded.socialConnections ?? [];

    const connected: ConnectedPlatform[] = connections
      .filter((conn) => conn.status === "connected")
      .map((conn) => ({
        platform: conn.platform,
        accountName: conn.accountName ?? null,
      }));

    return NextResponse.json({
      connected,
      message:
        connected.length === 0
          ? "Nenhuma plataforma conectada. Configure em Configurações > Integrações."
          : undefined,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "CONNECTED_PLATFORMS_ERROR" },
      { status: 500 }
    );
  }
}
