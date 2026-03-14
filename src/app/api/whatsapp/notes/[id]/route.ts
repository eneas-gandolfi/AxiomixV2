/**
 * Arquivo: src/app/api/whatsapp/notes/[id]/route.ts
 * Proposito: API para deletar uma nota especifica.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    // RLS garante que só o dono pode deletar
    const { error: deleteError } = await supabase
      .from("conversation_notes")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(`Falha ao deletar nota: ${deleteError.message}`);
    }

    return NextResponse.json({ message: "Nota deletada com sucesso." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao deletar nota.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
