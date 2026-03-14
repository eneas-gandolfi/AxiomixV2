/**
 * Arquivo: src/app/api/social/calendar/route.ts
 * Propósito: Retornar posts de um mês para o calendário editorial.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { listPostsByMonth, SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  platform: z.enum(["instagram", "linkedin", "tiktok"]).optional(),
  status: z.enum(["scheduled", "processing", "published", "partial", "failed", "cancelled"]).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SocialPublisherError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "CALENDAR_ERROR" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const sp = request.nextUrl.searchParams;

    const parsed = querySchema.safeParse({
      companyId: sp.get("companyId") ?? undefined,
      year: sp.get("year"),
      month: sp.get("month"),
      platform: sp.get("platform") ?? undefined,
      status: sp.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Query invalida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const posts = await listPostsByMonth({
      companyId: access.companyId,
      year: parsed.data.year,
      month: parsed.data.month,
      platforms: parsed.data.platform ? [parsed.data.platform] : undefined,
      status: parsed.data.status,
    });

    return NextResponse.json({ companyId: access.companyId, posts });
  } catch (error) {
    return errorResponse(error);
  }
}
