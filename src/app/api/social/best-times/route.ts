/**
 * Arquivo: src/app/api/social/best-times/route.ts
 * Propósito: Retornar os melhores horários para postar.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { analyzeBestTimes } from "@/services/social/best-times";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

export const dynamic = "force-dynamic";

const VALID_PLATFORMS = new Set<string>(["instagram", "linkedin", "tiktok", "facebook"]);

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "BEST_TIMES_ERROR" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
    const rawPlatform = request.nextUrl.searchParams.get("platform");

    const platform = rawPlatform && VALID_PLATFORMS.has(rawPlatform)
      ? (rawPlatform as SocialPlatform)
      : undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    const data = await analyzeBestTimes(access.companyId, platform);

    return NextResponse.json({ companyId: access.companyId, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}
