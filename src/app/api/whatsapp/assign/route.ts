/**
 * Arquivo: src/app/api/whatsapp/assign/route.ts
 * Propósito: Atribuir ou remover responsavel de uma conversa.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

const assignSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
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

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Se está atribuindo a alguém, verificar se o usuário pertence à empresa
    if (parsed.data.assignedTo) {
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("user_id", parsed.data.assignedTo)
        .eq("company_id", access.companyId)
        .maybeSingle();

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: "Usuário não pertence a esta empresa." },
          { status: 400 }
        );
      }
    }

    // Atualizar a conversa
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ assigned_to: parsed.data.assignedTo })
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId);

    if (updateError) {
      throw new Error(`Falha ao atribuir conversa: ${updateError.message}`);
    }

    return NextResponse.json({
      message: parsed.data.assignedTo
        ? "Conversa atribuída com sucesso."
        : "Responsável removido com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atribuir conversa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
