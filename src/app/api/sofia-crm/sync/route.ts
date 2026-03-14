/**
 * Arquivo: src/app/api/sofia-crm/sync/route.ts
 * Proposito: Disparar sincronizacao manual de conversas/mensagens do Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { syncConversations, syncMessages } from "@/services/sofia-crm/conversations";

export const dynamic = "force-dynamic";

const syncRequestSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
  conversationId: z.string().uuid("conversationId invalido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = syncRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (parsed.data.conversationId) {
      const messageResult = await syncMessages(access.companyId, parsed.data.conversationId);
      return NextResponse.json({
        companyId: access.companyId,
        mode: "messages",
        result: messageResult,
      });
    }

    const syncResult = await syncConversations(access.companyId);
    return NextResponse.json({
      companyId: access.companyId,
      mode: "conversations",
      result: syncResult,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "SOFIA_SYNC_ERROR" }, { status: 500 });
  }
}
