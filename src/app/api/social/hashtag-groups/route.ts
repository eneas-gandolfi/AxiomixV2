/**
 * Arquivo: src/app/api/social/hashtag-groups/route.ts
 * Propósito: Listar e criar grupos de hashtags.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  listHashtagGroups,
  createHashtagGroup,
  HashtagGroupError,
} from "@/services/social/hashtag-groups";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  name: z.string().min(1, "Nome é obrigatório.").max(100, "Nome excede 100 caracteres."),
  hashtags: z.array(z.string()).min(1, "Informe ao menos uma hashtag."),
});

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

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    const groups = await listHashtagGroups(access.companyId);

    return NextResponse.json({ companyId: access.companyId, groups });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json();

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const group = await createHashtagGroup(access.companyId, {
      name: parsed.data.name,
      hashtags: parsed.data.hashtags,
    });

    return NextResponse.json({ companyId: access.companyId, group });
  } catch (error) {
    return errorResponse(error);
  }
}
