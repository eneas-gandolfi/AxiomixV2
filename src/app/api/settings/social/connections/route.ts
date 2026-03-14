/**
 * Arquivo: src/app/api/settings/social/connections/route.ts
 * Proposito: Conectar redes sociais via Upload-Post e manter perfil por empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import {
  decodeIntegrationConfig,
  encodeIntegrationConfig,
  testIntegrationConnection,
} from "@/lib/integrations/service";
import type { SocialPlatform, UploadPostConfig, UploadPostSocialConnection } from "@/lib/integrations/types";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  disconnectUploadPostSocialConnection,
  ensureUploadPostProfile,
  resolveUploadPostServerConfig,
  startUploadPostSocialConnection,
  syncUploadPostConnectionsFromApi,
  upsertSocialConnectionInConfig,
} from "@/services/integrations/upload-post";

export const dynamic = "force-dynamic";

const connectSchema = z.object({
  platform: z.enum(["instagram", "linkedin", "tiktok", "facebook"]),
  redirectUrl: z.string().trim().url().optional(),
});

function pickTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeConnectionStatus(value: unknown): UploadPostSocialConnection["status"] {
  if (value === "connected" || value === "error" || value === "pending") {
    return value;
  }
  return "pending";
}

function mapRawSocialConnection(value: unknown): UploadPostSocialConnection | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const platformRaw = raw.platform;
  if (platformRaw !== "instagram" && platformRaw !== "linkedin" && platformRaw !== "tiktok" && platformRaw !== "facebook") {
    return null;
  }

  const id =
    pickTrimmedString(raw.id) ||
    pickTrimmedString(raw.external_connection_id) ||
    pickTrimmedString(raw.externalConnectionId) ||
    crypto.randomUUID();

  return {
    id,
    platform: platformRaw,
    status: normalizeConnectionStatus(raw.status),
    externalConnectionId:
      pickTrimmedString(raw.external_connection_id) ||
      pickTrimmedString(raw.externalConnectionId) ||
      null,
    accountName:
      pickTrimmedString(raw.account_name) ||
      pickTrimmedString(raw.accountName) ||
      pickTrimmedString(raw.handle) ||
      pickTrimmedString(raw.username) ||
      null,
    connectUrl:
      pickTrimmedString(raw.connect_url) ||
      pickTrimmedString(raw.connectUrl) ||
      pickTrimmedString(raw.auth_url) ||
      pickTrimmedString(raw.authUrl) ||
      pickTrimmedString(raw.url) ||
      null,
    connectedAt:
      pickTrimmedString(raw.connected_at) ||
      pickTrimmedString(raw.connectedAt) ||
      null,
    lastError:
      pickTrimmedString(raw.last_error) ||
      pickTrimmedString(raw.lastError) ||
      null,
  };
}

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

  const parsedConnections = rawConnections
    .map((entry) => mapRawSocialConnection(entry))
    .filter((entry): entry is UploadPostSocialConnection => Boolean(entry));

  const profileStatusRaw = raw.profile_status ?? raw.profileStatus;
  const profileStatus =
    profileStatusRaw === "pending" ||
    profileStatusRaw === "connected" ||
    profileStatusRaw === "error"
      ? profileStatusRaw
      : undefined;

  return {
    apiKey:
      pickTrimmedString(raw.api_key) ||
      pickTrimmedString(raw.apiKey) ||
      undefined,
    profileId:
      pickTrimmedString(raw.profile_id) ||
      pickTrimmedString(raw.profileId) ||
      undefined,
    profileName:
      pickTrimmedString(raw.profile_name) ||
      pickTrimmedString(raw.profileName) ||
      undefined,
    profileStatus,
    profileCreatedAt:
      pickTrimmedString(raw.profile_created_at) ||
      pickTrimmedString(raw.profileCreatedAt) ||
      undefined,
    socialConnections: parsedConnections.length > 0 ? parsedConnections : undefined,
  };
}

function decodeUploadPost(config: unknown): UploadPostConfig {
  try {
    return decodeIntegrationConfig("upload_post", config as never);
  } catch {
    return decodeUploadPostFallback(config);
  }
}

function buildUploadPostApiUrl(baseUrl: string, path: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/api") && path.startsWith("/api/")) {
    return `${normalized}${path.slice(4)}`;
  }

  return `${normalized}${path}`;
}

async function fetchUploadPostAccountInfo(config: { baseUrl: string; apiKey: string }) {
  try {
    const response = await fetch(buildUploadPostApiUrl(config.baseUrl, "/api/uploadposts/me"), {
      method: "GET",
      headers: {
        Authorization: `Apikey ${config.apiKey}`,
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payloadUnknown: unknown = await response.json().catch(() => ({}));
    const payload =
      typeof payloadUnknown === "object" && payloadUnknown !== null
        ? (payloadUnknown as Record<string, unknown>)
        : {};

    return {
      email: pickTrimmedString(payload.email) ?? null,
      plan: pickTrimmedString(payload.plan) ?? null,
    };
  } catch {
    return null;
  }
}

function platformLabel(platform: SocialPlatform) {
  if (platform === "instagram") {
    return "Instagram";
  }
  if (platform === "linkedin") {
    return "LinkedIn";
  }
  if (platform === "facebook") {
    return "Facebook";
  }
  return "TikTok";
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);
    const shouldSync = request.nextUrl.searchParams.get("sync") === "1";

    const [{ data: company }, { data: integration }] = await Promise.all([
      supabase.from("companies").select("id, name").eq("id", access.companyId).maybeSingle(),
      supabase
        .from("integrations")
        .select("id, config, is_active, test_status, last_tested_at")
        .eq("company_id", access.companyId)
        .eq("type", "upload_post")
        .maybeSingle(),
    ]);

    let decoded = integration?.config ? decodeUploadPost(integration.config) : {};
    let connections = decoded.socialConnections ?? [];
    let uploadPostAccount: { email: string | null; plan: string | null } | null = null;

    try {
      const config = resolveUploadPostServerConfig({
        apiKey: decoded.apiKey,
      });
      uploadPostAccount = await fetchUploadPostAccountInfo(config);
    } catch {
      // Se nao houver credenciais disponiveis, apenas nao exibe dados da conta.
    }

    if (shouldSync && decoded.profileId && connections.length > 0) {
      try {
        const config = resolveUploadPostServerConfig({
          apiKey: decoded.apiKey,
        });

        const synced = await syncUploadPostConnectionsFromApi({
          config,
          profileId: decoded.profileId,
          current: connections,
        });

        if (synced.changed) {
          connections = synced.connections;
          const hasConnected = connections.some((connection) => connection.status === "connected");
          decoded = {
            ...decoded,
            socialConnections: connections,
            profileStatus: hasConnected ? "connected" : decoded.profileStatus ?? "pending",
          };

          if (integration?.id && (access.role === "owner" || access.role === "admin")) {
            await supabase
              .from("integrations")
              .update({
                config: encodeIntegrationConfig("upload_post", decoded),
              })
              .eq("id", integration.id)
              .eq("company_id", access.companyId);
          }
        }
      } catch {
        // Falha de sync nao deve quebrar listagem da tela.
      }
    }

    return NextResponse.json({
      role: access.role,
      companyName: company?.name ?? "Empresa",
      profile: {
        id: decoded.profileId ?? null,
        name: decoded.profileName ?? null,
        status: decoded.profileStatus ?? null,
        createdAt: decoded.profileCreatedAt ?? null,
      },
      integrationStatus: {
        isActive: Boolean(integration?.is_active),
        testStatus: integration?.test_status ?? null,
        lastTestedAt: integration?.last_tested_at ?? null,
      },
      uploadPostAccount,
      connections,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "SOCIAL_CONNECTIONS_GET_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem conectar redes sociais.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = connectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", access.companyId)
      .single();

    if (!company?.name) {
      return NextResponse.json(
        { error: "Empresa nao encontrada.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: integration } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("company_id", access.companyId)
      .eq("type", "upload_post")
      .maybeSingle();

    const decoded = integration?.config ? decodeUploadPost(integration.config) : {};
    const config = resolveUploadPostServerConfig({
      apiKey: decoded.apiKey,
    });

    const profile = await ensureUploadPostProfile({
      config,
      companyId: access.companyId,
      companyName: company.name,
      existingProfileId: decoded.profileId,
    });

    // Melhor esforco: remove vinculacao anterior da mesma plataforma
    // para permitir reconectar com outra conta na Upload-Post.
    try {
      await disconnectUploadPostSocialConnection({
        config,
        profileId: profile.profileId,
        platform: parsed.data.platform,
      });
    } catch {
      // Se nao houver conexao existente, seguimos com a nova autorizacao.
    }

    const started = await startUploadPostSocialConnection({
      config,
      profileId: profile.profileId,
      companyId: access.companyId,
      platform: parsed.data.platform,
      redirectUrl: parsed.data.redirectUrl,
      redirectButtonText: "Fechar sem conectar",
      connectTitle: "Conectar redes sociais no AXIOMIX",
      connectDescription:
        "Conclua a autorizacao da conta. Esta janela fecha automaticamente ao detectar conexao.",
      showCalendar: false,
      readOnlyCalendar: false,
    });

    const nowIso = new Date().toISOString();
    const nextConnection: UploadPostSocialConnection = {
      id: started.connectionId,
      platform: parsed.data.platform,
      status: started.status,
      externalConnectionId: started.connectionId,
      accountName: started.accountName ?? null,
      connectUrl: started.connectUrl,
      connectedAt: started.status === "connected" ? nowIso : null,
      lastError: null,
    };

    const nextConfig: UploadPostConfig = {
      ...decoded,
      profileId: profile.profileId,
      profileName: profile.profileName,
      profileStatus: started.status === "connected" ? "connected" : "pending",
      profileCreatedAt: decoded.profileCreatedAt ?? nowIso,
      socialConnections: upsertSocialConnectionInConfig({
        current: decoded.socialConnections ?? [],
        next: nextConnection,
      }),
    };

    const test = await testIntegrationConnection("upload_post", nextConfig);

    const { error: upsertError } = await supabase.from("integrations").upsert(
      {
        company_id: access.companyId,
        type: "upload_post",
        config: encodeIntegrationConfig("upload_post", nextConfig),
        is_active: test.ok,
        test_status: test.ok ? "ok" : "error",
        last_tested_at: nowIso,
      },
      {
        onConflict: "company_id,type",
      }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: "Falha ao salvar conexao social.", code: "SOCIAL_CONNECTION_SAVE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: {
        id: nextConfig.profileId ?? null,
        name: nextConfig.profileName ?? null,
        status: nextConfig.profileStatus ?? null,
      },
      connection: nextConnection,
      connectUrl: started.connectUrl,
      connectLabel: `Conectar ${platformLabel(parsed.data.platform)}`,
      testDetail: test.detail,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "SOCIAL_CONNECTIONS_POST_ERROR" },
      { status: 500 }
    );
  }
}
