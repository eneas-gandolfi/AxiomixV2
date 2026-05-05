/**
 * Arquivo: src/app/api/whatsapp/operator-nudges/[id]/route.ts
 * Propósito: PATCH pra marcar uma nudge específica como lida.
 *            RLS restringe a operação ao destinatário (to_user_id).
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("operator_nudges")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, read_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "UPDATE_ERROR" },
        { status: 500 },
      );
    }

    if (!data) {
      // Nudge não existe ou pertence a outro usuário (RLS bloqueou)
      return NextResponse.json(
        { error: "Nudge não encontrada.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, nudge: data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "NUDGE_PATCH_ERROR" },
      { status: 500 },
    );
  }
}
