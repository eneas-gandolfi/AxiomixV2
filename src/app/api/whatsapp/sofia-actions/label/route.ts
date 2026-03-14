/**
 * Arquivo: src/app/api/whatsapp/sofia-actions/label/route.ts
 * Proposito: Adicionar label/tag a um contato no Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";

const addLabelSchema = z.object({
  companyId: z.string().uuid(),
  conversationId: z.string().uuid(),
  contactId: z.string().min(1),
  label: z.string().min(1).max(50),
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

  const parsed = addLabelSchema.safeParse(body);
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
      .select("id")
      .eq("id", parsed.data.conversationId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    // Adicionar label no Sofia CRM
    const sofiaClient = await getSofiaCrmClient(access.companyId);

    await sofiaClient.addContactLabel({
      contactId: parsed.data.contactId,
      label: parsed.data.label,
    });

    return NextResponse.json({
      message: "Label adicionada com sucesso ao contato.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar label.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
