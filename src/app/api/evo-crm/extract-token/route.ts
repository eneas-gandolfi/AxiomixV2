/**
 * Arquivo: src/app/api/evo-crm/extract-token/route.ts
 * Propósito: Login programático no Evo Auth Service e extração do `access_token`
 *            de USUÁRIO retornado em `GET /api/v1/profile`. Token de usuário
 *            Administrator/Super Admin enxerga TODAS as conversas; token de
 *            Agent só vê seus inboxes (filtro em ConversationFinder).
 *
 * Endpoint útil quando o painel do Evo CRM não expõe Access Token na UI de
 * "Meu Perfil" (validado: a UI esconde, mas backend retorna em /api/v1/profile).
 *
 * Acesso: POST { email, password } — apenas para usuários autenticados no Axiomix.
 * Resposta: { user: { id, name, email, role }, access_token: "..." }
 *
 * Autor: AXIOMIX
 * Data: 2026-05-15
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(1, "Senha obrigatória."),
  baseUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    await resolveCompanyAccess(supabase);

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const baseUrl = (parsed.data.baseUrl ?? process.env.EVO_AUTH_BASE_URL ?? "https://api.getlead.capital").replace(
      /\/+$/,
      ""
    );

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
    });
    const loginText = await loginRes.text();
    if (!loginRes.ok) {
      return NextResponse.json(
        {
          error: `Login falhou (${loginRes.status}): ${loginText.slice(0, 200)}`,
          code: "LOGIN_FAILED",
        },
        { status: 400 }
      );
    }
    let loginJson: Record<string, unknown>;
    try {
      loginJson = JSON.parse(loginText);
    } catch {
      return NextResponse.json(
        { error: "Login retornou resposta não-JSON.", code: "INVALID_JSON" },
        { status: 502 }
      );
    }

    function extractJwt(json: unknown): string | null {
      if (!json || typeof json !== "object") return null;
      const root = json as Record<string, unknown>;
      const keys = ["access_token", "token", "jwt", "id_token", "auth_token", "accessToken"];
      for (const k of keys) {
        const v = root[k];
        if (typeof v === "string" && v.split(".").length === 3) return v;
      }
      if (root.data && typeof root.data === "object") return extractJwt(root.data);
      return null;
    }
    const jwt = extractJwt(loginJson);
    if (!jwt) {
      return NextResponse.json(
        {
          error: "Login OK mas JWT não encontrado no payload.",
          code: "JWT_NOT_FOUND",
          loginPayloadKeys: Object.keys(loginJson),
        },
        { status: 502 }
      );
    }

    const profileRes = await fetch(`${baseUrl}/api/v1/profile`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        accept: "application/json",
      },
    });
    const profileText = await profileRes.text();
    if (!profileRes.ok) {
      return NextResponse.json(
        {
          error: `GET /profile falhou (${profileRes.status}): ${profileText.slice(0, 200)}`,
          code: "PROFILE_FAILED",
        },
        { status: 400 }
      );
    }
    let profileJson: Record<string, unknown>;
    try {
      profileJson = JSON.parse(profileText);
    } catch {
      return NextResponse.json(
        { error: "Profile retornou resposta não-JSON.", code: "INVALID_JSON" },
        { status: 502 }
      );
    }

    function extractAccessToken(json: unknown): string | null {
      if (!json || typeof json !== "object") return null;
      const root = json as Record<string, unknown>;
      // /api/v1/profile retorna user serializer com `access_token` no top-level.
      const direct = root.access_token;
      if (typeof direct === "string") return direct;
      if (root.data && typeof root.data === "object") return extractAccessToken(root.data);
      return null;
    }
    const accessToken = extractAccessToken(profileJson);

    const profileRoot = (profileJson?.data && typeof profileJson.data === "object"
      ? (profileJson.data as Record<string, unknown>)
      : profileJson) as Record<string, unknown>;
    const userInfo = {
      id: typeof profileRoot.id !== "undefined" ? String(profileRoot.id) : null,
      name: typeof profileRoot.name === "string" ? profileRoot.name : null,
      email: typeof profileRoot.email === "string" ? profileRoot.email : null,
      role: typeof profileRoot.role === "string" ? profileRoot.role : null,
      type: typeof profileRoot.type === "string" ? profileRoot.type : null,
    };

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Profile OK mas access_token não encontrado.",
          code: "ACCESS_TOKEN_NOT_FOUND",
          profileKeys: Object.keys(profileRoot),
          user: userInfo,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      user: userInfo,
      access_token: accessToken,
      hint:
        userInfo.role && /admin|super/i.test(userInfo.role)
          ? "Role é admin/super — esse token vê todas as conversas. Cole no Axiomix > Reconfigurar conexão."
          : `Role do usuário é "${userInfo.role}". Apenas administrator/super_admin vê todas conversas. Considere usar credenciais de um admin.`,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EXTRACT_TOKEN_ERROR" }, { status: 500 });
  }
}
