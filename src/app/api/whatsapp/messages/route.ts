/**
 * Arquivo: src/app/api/whatsapp/messages/route.ts
 * Propósito: Buscar mensagens de uma conversa (para polling em tempo real do chat).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { companyId, conversationId, after } = await request.json();

    if (!companyId || !conversationId) {
      return NextResponse.json(
        { error: "companyId e conversationId são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("messages")
      .select("id, content, direction, sent_at")
      .eq("company_id", companyId)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });

    // Se "after" foi passado, buscar apenas mensagens novas
    if (after) {
      query = query.gt("sent_at", after);
    }

    const { data: messages } = await query;

    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar mensagens.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
