/**
 * Arquivo: src/app/api/social/media-library/[id]/route.ts
 * Propósito: Deletar e atualizar tags de midias individuais na biblioteca.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { deleteMediaFile, updateMediaFileTags } from "@/services/social/media-library";
import { SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const deleteSchema = z.object({
  companyId: z.string().uuid().optional(),
});

const patchSchema = z.object({
  companyId: z.string().uuid().optional(),
  tags: z.array(z.string()),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SocialPublisherError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "MEDIA_LIBRARY_ERROR" }, { status: 500 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    await deleteMediaFile(access.companyId, id);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const updated = await updateMediaFileTags(access.companyId, id, parsed.data.tags);

    return NextResponse.json({ companyId: access.companyId, item: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
