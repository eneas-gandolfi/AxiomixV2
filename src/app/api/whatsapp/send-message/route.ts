/**
 * Arquivo: src/app/api/whatsapp/send-message/route.ts
 * Propósito: Enviar mensagem numa conversa via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
  conversationExternalId: z.string().min(1, "conversationExternalId é obrigatório."),
  content: z.string().min(1, "content é obrigatório."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = sendMessageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const sofiaClient = await getSofiaCrmClient(access.companyId);
    await sofiaClient.sendMessage(parsed.data.conversationExternalId, parsed.data.content);

    // Salvar a mensagem localmente também
    await supabase.from("messages").insert({
      company_id: access.companyId,
      conversation_id: parsed.data.conversationExternalId,
      content: parsed.data.content,
      direction: "outbound",
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao enviar mensagem.";
    return NextResponse.json({ error: message, code: "SEND_MESSAGE_ERROR" }, { status: 500 });
  }
}
