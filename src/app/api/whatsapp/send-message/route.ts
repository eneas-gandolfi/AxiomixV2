/**
 * Arquivo: src/app/api/whatsapp/send-message/route.ts
 * Propósito: Enviar mensagem numa conversa via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
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
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // 1. Enviar para Evo CRM (fonte de verdade operacional)
    const evoClient = await getEvoCrmClient(access.companyId);
    await evoClient.sendMessage(parsed.data.conversationExternalId, parsed.data.content);

    // 2. Salvar localmente para Realtime push imediato ao browser
    //    Buscar conversation_id (uuid) a partir do external_id
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("company_id", access.companyId)
      .eq("external_id", parsed.data.conversationExternalId)
      .maybeSingle();

    if (conversation) {
      await supabase.from("messages").insert({
        company_id: access.companyId,
        conversation_id: conversation.id,
        content: parsed.data.content,
        direction: "outbound",
        sent_at: new Date().toISOString(),
        message_type: "outgoing",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao enviar mensagem.";
    return NextResponse.json({ error: message, code: "SEND_MESSAGE_ERROR" }, { status: 500 });
  }
}
