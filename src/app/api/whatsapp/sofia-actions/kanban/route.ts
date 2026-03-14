/**
 * Arquivo: src/app/api/whatsapp/sofia-actions/kanban/route.ts
 * Proposito: Criar card no kanban do Sofia CRM a partir de uma conversa.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

const createKanbanCardSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = createKanbanCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Verificar se a conversa existe
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, contact_name, remote_jid, external_id")
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    // Buscar insight para incluir na descrição
    const { data: insight } = await supabase
      .from("conversation_insights")
      .select("sentiment, intent, summary")
      .eq("conversation_id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    // Construir descrição do card
    let description = parsed.data.description ?? "";

    if (insight) {
      description += `\n\n--- Análise IA ---\n`;
      description += `Sentimento: ${insight.sentiment ?? "N/A"}\n`;
      description += `Intenção: ${insight.intent ?? "N/A"}\n`;
      if (insight.summary) {
        description += `Resumo: ${insight.summary}\n`;
      }
    }

    description += `\nContato: ${conversation.contact_name ?? conversation.remote_jid}`;
    description += `\nID Conversa: ${conversation.external_id ?? conversation.id}`;
    description += `\nCriado via Axiomix WhatsApp Intelligence`;

    // Criar card no Sofia CRM
    const sofiaClient = await getSofiaCrmClient(access.companyId);

    await sofiaClient.createKanbanCard({
      boardId: parsed.data.boardId,
      title: parsed.data.title,
      description,
    });

    return NextResponse.json({
      message: "Card criado com sucesso no Sofia CRM.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar card no kanban.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
