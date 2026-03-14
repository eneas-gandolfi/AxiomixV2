/**
 * Arquivo: src/app/api/whatsapp/notes/route.ts
 * Proposito: API para criar e listar notas de conversas.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

const createNoteSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
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

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Verificar se a conversa existe e pertence à empresa
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    // Criar a nota
    const { data: note, error: noteError } = await supabase
      .from("conversation_notes")
      .insert({
        conversation_id: parsed.data.conversationId,
        company_id: access.companyId,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select("id, content, created_at")
      .single();

    if (noteError) {
      throw new Error(`Falha ao criar nota: ${noteError.message}`);
    }

    return NextResponse.json({
      message: "Nota criada com sucesso.",
      note,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar nota.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const listNotesSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const conversationId = searchParams.get("conversationId");

  const parsed = listNotesSchema.safeParse({ companyId, conversationId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    const { data: notes, error: notesError } = await supabase
      .from("conversation_notes")
      .select(
        `
        id,
        content,
        created_at,
        updated_at,
        user_id
      `
      )
      .eq("conversation_id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .order("created_at", { ascending: false });

    if (notesError) {
      throw new Error(`Falha ao carregar notas: ${notesError.message}`);
    }

    return NextResponse.json({ notes: notes ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar notas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
