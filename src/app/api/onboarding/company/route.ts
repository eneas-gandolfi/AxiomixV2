/**
 * Arquivo: src/app/api/onboarding/company/route.ts
 * Propósito: Criar empresa inicial no onboarding e vincular usuário como owner.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa é obrigatório."),
  niche: z.string().trim().min(2, "Nicho é obrigatório."),
  subNiche: z.string().trim().optional(),
  websiteUrl: z.string().trim().url("URL do site inválida.").optional().or(z.literal("")),
});

type DatabaseError = {
  code?: string;
  message?: string;
};

type CreatedCompany = {
  id: string;
  slug: string;
};

async function generateUniqueSlug(
  baseName: string,
  findBySlug: (slug: string) => Promise<boolean>
) {
  const fallbackSlug = `empresa-${Date.now()}`;
  const baseSlug = slugify(baseName) || fallbackSlug;
  let candidate = baseSlug;
  let suffix = 2;

  while (await findBySlug(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isUniqueViolation(error: DatabaseError | null) {
  return error?.code === "23505";
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const rawBody: unknown = await request.json();
    const parsed = onboardingSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: existingMembership, error: membershipLookupError } = await admin
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipLookupError) {
      return NextResponse.json(
        { error: "Falha ao verificar empresa existente.", code: "MEMBERSHIP_LOOKUP_ERROR" },
        { status: 500 }
      );
    }

    if (existingMembership?.company_id) {
      return NextResponse.json(
        { error: "Usuário já possui empresa vinculada.", code: "COMPANY_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    // Backfill defensivo para usuários criados antes do trigger handle_new_user.
    const { error: userProfileError } = await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name:
          typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
        avatar_url:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      },
      {
        onConflict: "id",
      }
    );

    if (userProfileError) {
      return NextResponse.json(
        { error: "Não foi possível preparar perfil do usuário.", code: "USER_PROFILE_ERROR" },
        { status: 500 }
      );
    }

    let company: CreatedCompany | null = null;
    let companyError: DatabaseError | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = await generateUniqueSlug(parsed.data.name, async (candidate) => {
        const { data: slugRow, error: slugLookupError } = await admin
          .from("companies")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();

        if (slugLookupError) {
          throw new Error("Falha ao verificar slug disponível.");
        }

        return Boolean(slugRow?.id);
      });

      const companyInsert = await admin
        .from("companies")
        .insert({
          name: parsed.data.name,
          niche: parsed.data.niche,
          sub_niche: parsed.data.subNiche || null,
          website_url: parsed.data.websiteUrl || null,
          slug,
        })
        .select("id, slug")
        .single();

      if (!companyInsert.error && companyInsert.data) {
        company = companyInsert.data;
        companyError = null;
        break;
      }

      companyError = companyInsert.error;
      if (!isUniqueViolation(companyError)) {
        break;
      }
    }

    if (companyError || !company) {
      const status = companyError?.code === "42501" ? 403 : 500;

      return NextResponse.json(
        {
          error: "Não foi possível criar a empresa.",
          code: "COMPANY_CREATE_ERROR",
          detail:
            process.env.NODE_ENV === "production"
              ? undefined
              : {
                  dbCode: companyError?.code ?? null,
                  dbMessage: companyError?.message ?? null,
                },
        },
        { status }
      );
    }

    const { error: membershipCreateError } = await admin.from("memberships").insert({
      user_id: user.id,
      company_id: company.id,
      role: "owner",
    });

    if (membershipCreateError) {
      const membershipStatus = membershipCreateError.code === "23505" ? 409 : 500;
      return NextResponse.json(
        {
          error: "Não foi possível criar o vínculo de acesso.",
          code: "MEMBERSHIP_CREATE_ERROR",
          detail:
            process.env.NODE_ENV === "production"
              ? undefined
              : {
                  dbCode: membershipCreateError.code ?? null,
                  dbMessage: membershipCreateError.message ?? null,
                },
        },
        { status: membershipStatus }
      );
    }

    return NextResponse.json({
      companyId: company.id,
      slug: company.slug,
      redirectTo: "/settings?tab=integrations",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ONBOARDING_ERROR" }, { status: 500 });
  }
}
