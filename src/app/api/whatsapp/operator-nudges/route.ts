/**
 * Arquivo: src/app/api/whatsapp/operator-nudges/route.ts
 * Propósito: Notificações "Avisar [Operador]" do gestor pro atendente.
 *   - GET: lista nudges do usuário atual (não lidas)
 *   - POST: cria nudge (gestor avisando atendente)
 *
 *   PATCH para marcar como lido vive em /[id]/route.ts.
 * Autor: AXIOMIX
 * Data: 2026-05-07
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createNudgeSchema = z.object({
  conversationId: z.string().uuid(),
  toUserId: z.string().uuid(),
  customerName: z.string().nullable().optional(),
  waitSeconds: z.number().int().nonnegative().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
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

    // RLS já filtra pra só nudges destinadas ao usuário atual.
    // Em paralelo: descobre se o usuário é operador (pelo menos 1 conversa
    // já foi atribuída a ele) — usado pelo client pra esconder o sino
    // quando o user é só gestor que nunca recebe aviso.
    const [{ data, error }, { count: assignedCount }] = await Promise.all([
      supabase
        .from("operator_nudges")
        .select(
          "id, company_id, conversation_id, from_user_id, customer_name, wait_seconds, created_at, read_at",
        )
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .limit(1),
    ]);

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "FETCH_ERROR" },
        { status: 500 },
      );
    }

    const nudges = data ?? [];
    return NextResponse.json({
      nudges,
      unreadCount: nudges.length,
      // True quando o user já apareceu como assigned_to em alguma conversa,
      // OU quando já recebeu nudge (mesmo que lida — caso de operador
      // legado sem conversas atuais).
      isOperator: (assignedCount ?? 0) > 0 || nudges.length > 0,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "NUDGES_GET_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/whatsapp/operator-nudges
 * Marca TODAS as nudges não-lidas do usuário atual como lidas. Útil pra
 * "limpar tudo" no popover do sino.
 */
export async function PATCH(request: NextRequest) {
  try {
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

    // RLS já restringe ao destinatário (`to_user_id = auth.uid()`).
    const { data, error } = await supabase
      .from("operator_nudges")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "MARK_ALL_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      markedCount: data?.length ?? 0,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "NUDGES_MARK_ALL_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const rawBody = await request.json();
    const parsed = createNudgeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Payload inválido.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // Resolve company_id da conversa pra preencher o nudge.
    // RLS na tabela conversations garante que o usuário tem acesso.
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, company_id")
      .eq("id", parsed.data.conversationId)
      .maybeSingle();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada.", code: "CONVERSATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!conversation.company_id) {
      return NextResponse.json(
        { error: "Conversa sem empresa vinculada.", code: "INVALID_CONVERSATION" },
        { status: 400 },
      );
    }

    // RLS na operator_nudges valida que ambos (from/to) pertencem à empresa.
    const { data, error } = await supabase
      .from("operator_nudges")
      .insert({
        company_id: conversation.company_id,
        conversation_id: conversation.id,
        from_user_id: user.id,
        to_user_id: parsed.data.toUserId,
        customer_name: parsed.data.customerName ?? null,
        wait_seconds: parsed.data.waitSeconds ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      // RLS violation = either user not in company, or recipient not in same company
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        {
          error:
            status === 403
              ? "Você ou o destinatário não pertencem à empresa desta conversa."
              : error.message,
          code: status === 403 ? "FORBIDDEN" : "INSERT_ERROR",
        },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      nudge: data,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "NUDGES_POST_ERROR" },
      { status: 500 },
    );
  }
}
