/**
 * Arquivo: src/app/api/social/demands/[id]/approval-link/route.ts
 * Propósito: Gerar link público de aprovação para uma demanda.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { generateApprovalToken, ContentDemandError } from "@/services/social/content-demands";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ContentDemandError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "APPROVAL_LINK_ERROR" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = (await request.json().catch(() => ({}))).companyId ?? undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    const { token, expiresAt } = await generateApprovalToken(access.companyId, id);

    const origin = request.nextUrl.origin;
    const approvalUrl = `${origin}/aprovacao/${token}`;

    return NextResponse.json({
      companyId: access.companyId,
      token,
      url: approvalUrl,
      expiresAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
