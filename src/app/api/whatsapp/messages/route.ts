/**
 * Arquivo: src/app/api/whatsapp/messages/route.ts
 * Propósito: Buscar mensagens de uma conversa (para polling em tempo real do chat).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

export const dynamic = "force-dynamic";

const messagesSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
  conversationId: z.string().min(1, "conversationId é obrigatório."),
  after: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = messagesSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    let query = supabase
      .from("messages")
      .select("id, content, direction, sent_at")
      .eq("company_id", access.companyId)
      .eq("conversation_id", parsed.data.conversationId)
      .order("sent_at", { ascending: true });

    if (parsed.data.after) {
      query = query.gt("sent_at", parsed.data.after);
    }

    const { data: messages } = await query;

    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar mensagens.";
    return NextResponse.json({ error: message, code: "MESSAGES_ERROR" }, { status: 500 });
  }
}
