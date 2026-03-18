/**
 * Arquivo: src/app/api/social/demands/[id]/transition/route.ts
 * Propósito: Transicionar o status de uma demanda de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { transitionStatus, ContentDemandError } from "@/services/social/content-demands";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  companyId: z.string().uuid().optional(),
  toStatus: z.enum([
    "rascunho", "em_revisao", "alteracoes_solicitadas", "aprovado", "agendado", "publicado",
  ]),
  comment: z.string().max(500).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ContentDemandError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "TRANSITION_ERROR" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json();

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const demand = await transitionStatus(
      access.companyId,
      id,
      access.userId,
      parsed.data.toStatus,
      parsed.data.comment
    );

    return NextResponse.json({ companyId: access.companyId, demand });
  } catch (error) {
    return errorResponse(error);
  }
}
