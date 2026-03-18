/**
 * Arquivo: src/app/api/whatsapp/session-status/route.ts
 * Propósito: Verificar status da janela de 24h de uma conversa WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const sessionStatusSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  conversationExternalId: z.string().min(1, "conversationExternalId é obrigatório."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = sessionStatusSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);
    const status = await sofiaClient.getSessionStatus(parsed.data.conversationExternalId);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao verificar sessão.";
    return NextResponse.json({ error: message, code: "SESSION_STATUS_ERROR" }, { status: 500 });
  }
}
