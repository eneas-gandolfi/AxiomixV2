/**
 * Arquivo: src/app/api/social/schedule/[id]/route.ts
 * Proposito: Cancelar agendamentos do Social Publisher com status scheduled.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cancelScheduledPost, SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

const routeParamsSchema = z.object({
  id: z.string().uuid("id do agendamento invalido."),
});

const deleteSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function socialErrorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof SocialPublisherError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "SOCIAL_CANCEL_ERROR" }, { status: 500 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const params = await context.params;
    const parsedParams = routeParamsSchema.safeParse(params);

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
    const cancelled = await cancelScheduledPost(access.companyId, parsedParams.data.id);

    return NextResponse.json({
      companyId: access.companyId,
      item: cancelled,
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
