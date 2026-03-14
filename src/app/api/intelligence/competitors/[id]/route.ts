/**
 * Arquivo: src/app/api/intelligence/competitors/[id]/route.ts
 * Proposito: Remover concorrente de uma empresa no modulo Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid("id do concorrente invalido."),
});

const deleteSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const params = await context.params;
    const parsedParams = paramsSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { error: parsedParams.error.issues[0]?.message ?? "Parametro invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsedBody = deleteSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsedBody.data.companyId);
    const { data: existing, error: existingError } = await supabase
      .from("competitor_profiles")
      .select("id")
      .eq("id", parsedParams.data.id)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Falha ao validar concorrente.", code: "COMPETITOR_FETCH_ERROR" },
        { status: 500 }
      );
    }

    if (!existing?.id) {
      return NextResponse.json(
        { error: "Concorrente nao encontrado para esta empresa.", code: "COMPETITOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("competitor_profiles")
      .delete()
      .eq("id", parsedParams.data.id)
      .eq("company_id", access.companyId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Falha ao remover concorrente.", code: "COMPETITOR_DELETE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: parsedParams.data.id,
      companyId: access.companyId,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "COMPETITOR_DELETE_UNEXPECTED" }, { status: 500 });
  }
}
