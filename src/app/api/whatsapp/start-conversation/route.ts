/**
 * Arquivo: src/app/api/whatsapp/start-conversation/route.ts
 * Propósito: Iniciar nova conversa WhatsApp via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export const dynamic = "force-dynamic";

const startConversationSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  phone: z.string().min(1, "phone é obrigatório."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = startConversationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const evoClient = await getEvoCrmClient(access.companyId);
    const result = await evoClient.startConversation(parsed.data.phone);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao iniciar conversa.";
    return NextResponse.json({ error: message, code: "START_CONVERSATION_ERROR" }, { status: 500 });
  }
}
