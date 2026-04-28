/**
 * Arquivo: src/app/api/intelligence/competitors/route.ts
 * Propósito: Gerenciar concorrentes do módulo Intelligence com limite de 3 por empresa.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { handleRouteError } from "@/lib/api/handle-route-error";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
});

const competitorCreateSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  name: z.string().trim().min(2, "Nome do concorrente é obrigatório."),
  websiteUrl: z.string().trim().url("Website inválido.").optional().or(z.literal("")),
  instagramUrl: z.string().trim().url("Instagram inválido.").optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url("LinkedIn inválido.").optional().or(z.literal("")),
});

function normalizeOptionalUrl(value?: string) {
  if (!value) {
    return null;
  }
  return value.trim() || null;
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const parsedQuery = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0]?.message ?? "Query inválida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsedQuery.data.companyId);
    const { data: competitors, error } = await supabase
      .from("competitor_profiles")
      .select("id, name, website_url, instagram_url, linkedin_url, created_at")
      .eq("company_id", access.companyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Falha ao carregar concorrentes.", code: "COMPETITORS_FETCH_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: competitors ?? [],
      companyId: access.companyId,
    });
  } catch (error) {
    return handleRouteError(error, "INTELLIGENCE_ERROR", request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = competitorCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const { count, error: countError } = await supabase
      .from("competitor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", access.companyId);

    if (countError) {
      return NextResponse.json(
        { error: "Falha ao validar limite de concorrentes.", code: "COMPETITOR_LIMIT_ERROR" },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Limite de 3 concorrentes por empresa atingido.", code: "COMPETITOR_LIMIT_REACHED" },
        { status: 409 }
      );
    }

    const { data: created, error } = await supabase
      .from("competitor_profiles")
      .insert({
        company_id: access.companyId,
        name: parsed.data.name,
        website_url: normalizeOptionalUrl(parsed.data.websiteUrl),
        instagram_url: normalizeOptionalUrl(parsed.data.instagramUrl),
        linkedin_url: normalizeOptionalUrl(parsed.data.linkedinUrl),
      })
      .select("id, name, website_url, instagram_url, linkedin_url, created_at")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: "Falha ao criar concorrente.", code: "COMPETITOR_CREATE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: created,
      companyId: access.companyId,
    });
  } catch (error) {
    return handleRouteError(error, "INTELLIGENCE_ERROR", request);
  }
}
