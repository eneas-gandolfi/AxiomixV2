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
    logoUrl: z
      .string()
      .trim()
      .url("Logo URL inválida.")
      .optional()
      .or(z.literal("")),
  })
  .refine((value) => value.name || value.niche || typeof value.logoUrl !== "undefined", {
    message: "Nenhum campo para atualizar.",
  });

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
      .select("id, name, niche, sub_niche, website_url, logo_url, slug")
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

    const { data: updatedCompany, error } = await supabase
      .from("companies")
      .update({
        name: parsed.data.name,
        niche: parsed.data.niche,
        logo_url: parsed.data.logoUrl || null,
      })
      .eq("id", membership.company_id)
      .select("id, name, niche, sub_niche, website_url, logo_url, slug")
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
        logoUrl: updatedCompany.logo_url,
        slug: updatedCompany.slug,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "COMPANY_PATCH_ERROR" }, { status: 500 });
  }
}
