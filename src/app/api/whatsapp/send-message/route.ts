/**
 * Arquivo: src/app/api/whatsapp/send-message/route.ts
 * Propósito: Enviar mensagem numa conversa via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { companyId, conversationExternalId, content } = await request.json();

    if (!companyId || !conversationExternalId || !content) {
      return NextResponse.json(
        { error: "companyId, conversationExternalId e content são obrigatórios." },
        { status: 400 }
      );
    }

    const sofiaClient = await getSofiaCrmClient(companyId);
    await sofiaClient.sendMessage(conversationExternalId, content);

    // Salvar a mensagem localmente também
    const supabase = await createSupabaseServerClient();
    await supabase.from("messages").insert({
      company_id: companyId,
      conversation_id: conversationExternalId,
      content,
      direction: "outbound",
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar mensagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
