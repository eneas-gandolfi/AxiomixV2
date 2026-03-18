/**
 * Arquivo: src/app/api/social/schedule/[id]/reschedule/route.ts
 * Propósito: Reagendar um post via drag-and-drop do calendário editorial.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { reschedulePost, SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  newScheduledAt: z.string().datetime("newScheduledAt inválido."),
});

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SocialPublisherError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "RESCHEDULE_ERROR" }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const result = await reschedulePost({
      companyId: access.companyId,
      scheduledPostId: id,
      newScheduledAtIso: parsed.data.newScheduledAt,
    });

    return NextResponse.json({ companyId: access.companyId, post: result });
  } catch (error) {
    return errorResponse(error);
  }
}
