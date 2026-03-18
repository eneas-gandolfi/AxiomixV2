/**
 * Arquivo: src/app/api/whatsapp/resolve/route.ts
 * Propósito: Marcar conversa como resolvida ou mudar status.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

const resolveSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
  status: z.string().min(1),
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

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Atualizar o status da conversa
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId);

    if (updateError) {
      throw new Error(`Falha ao atualizar status: ${updateError.message}`);
    }

    return NextResponse.json({
      message: `Status alterado para "${parsed.data.status}" com sucesso.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
