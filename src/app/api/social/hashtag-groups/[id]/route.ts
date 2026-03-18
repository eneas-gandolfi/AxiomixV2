/**
 * Arquivo: src/app/api/social/hashtag-groups/[id]/route.ts
 * Propósito: Atualizar e excluir grupos de hashtags.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  updateHashtagGroup,
  deleteHashtagGroup,
  HashtagGroupError,
} from "@/services/social/hashtag-groups";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  name: z.string().min(1, "Nome é obrigatório.").max(100, "Nome excede 100 caracteres."),
  hashtags: z.array(z.string()).min(1, "Informe ao menos uma hashtag."),
});

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof HashtagGroupError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "HASHTAG_GROUPS_ERROR" }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const group = await updateHashtagGroup(access.companyId, id, {
      name: parsed.data.name,
      hashtags: parsed.data.hashtags,
    });

    return NextResponse.json({ companyId: access.companyId, group });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    await deleteHashtagGroup(access.companyId, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
