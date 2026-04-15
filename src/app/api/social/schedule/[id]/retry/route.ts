/**
 * Arquivo: src/app/api/social/schedule/[id]/retry/route.ts
 * Proposito: Reexecutar um post com status failed ou partial, reagendando para "agora".
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { retryScheduledPost, SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
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
  return NextResponse.json({ error: detail, code: "RETRY_ERROR" }, { status: 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const raw: unknown = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const result = await retryScheduledPost({
      companyId: access.companyId,
      scheduledPostId: id,
    });

    return NextResponse.json({ companyId: access.companyId, post: result });
  } catch (error) {
    return errorResponse(error);
  }
}
