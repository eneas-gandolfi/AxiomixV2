/**
 * Arquivo: src/app/api/company/route.ts
 * Propósito: Ler e atualizar dados da empresa do usuário autenticado.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const companyUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Nome inválido.").optional(),
    niche: z.string().trim().min(2, "Nicho inválido.").optional(),
    subNiche: z.string().trim().max(120, "Sub-nicho muito longo.").optional().or(z.literal("")),
    websiteUrl: z
      .string()
      .trim()
      .url("Website inválido.")
      .optional()
      .or(z.literal("")),
    timezone: z.string().trim().min(3, "Timezone inválido.").max(64, "Timezone inválido.").optional(),
    logoUrl: z
      .string()
      .trim()
      .url("Logo URL inválida.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (value) =>
      value.name ||
      value.niche ||
      typeof value.subNiche !== "undefined" ||
      typeof value.websiteUrl !== "undefined" ||
      typeof value.timezone !== "undefined" ||
      typeof value.logoUrl !== "undefined",
    { message: "Nenhum campo para atualizar." }
  );

async function getCurrentMembership(request: NextRequest, response: NextResponse) {
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, membership: null, authError: true };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { supabase, membership, authError: false };
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { supabase, membership, authError } = await getCurrentMembership(request, response);

    if (authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: company, error } = await supabase
      .from("companies")
      .select("id, name, niche, sub_niche, website_url, timezone, logo_url, slug")
      .eq("id", membership.company_id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: "Não foi possível carregar a empresa.", code: "COMPANY_FETCH_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        niche: company.niche,
        subNiche: company.sub_niche,
        websiteUrl: company.website_url,
        timezone: company.timezone,
        logoUrl: company.logo_url,
        slug: company.slug,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "COMPANY_GET_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { supabase, membership, authError } = await getCurrentMembership(request, response);

    if (authError) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem editar a empresa.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const rawBody = await request.json();
    const parsed = companyUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof parsed.data.name !== "undefined") {
      updatePayload.name = parsed.data.name;
    }
    if (typeof parsed.data.niche !== "undefined") {
      updatePayload.niche = parsed.data.niche;
    }
    if (typeof parsed.data.subNiche !== "undefined") {
      updatePayload.sub_niche = parsed.data.subNiche || null;
    }
    if (typeof parsed.data.websiteUrl !== "undefined") {
      updatePayload.website_url = parsed.data.websiteUrl || null;
    }
    if (typeof parsed.data.timezone !== "undefined") {
      updatePayload.timezone = parsed.data.timezone;
    }
    if (typeof parsed.data.logoUrl !== "undefined") {
      updatePayload.logo_url = parsed.data.logoUrl || null;
    }

    const { data: updatedCompany, error } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", membership.company_id)
      .select("id, name, niche, sub_niche, website_url, timezone, logo_url, slug")
      .single();

    if (error || !updatedCompany) {
      return NextResponse.json(
        { error: "Não foi possível atualizar a empresa.", code: "COMPANY_UPDATE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        niche: updatedCompany.niche,
        subNiche: updatedCompany.sub_niche,
        websiteUrl: updatedCompany.website_url,
        timezone: updatedCompany.timezone,
        logoUrl: updatedCompany.logo_url,
        slug: updatedCompany.slug,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "COMPANY_PATCH_ERROR" }, { status: 500 });
  }
}
