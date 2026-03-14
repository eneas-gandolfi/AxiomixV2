/**
 * Arquivo: src/app/api/intelligence/posts/[id]/route.ts
 * Proposito: API para deletar posts do Content Radar
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const deletePostSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
});

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = deletePostSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const params = await context.params;
    const postId = params.id;

    // Verificar se o post pertence à empresa
    const { data: post, error: fetchError } = await supabase
      .from("collected_posts")
      .select("id, company_id")
      .eq("id", postId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Falha ao buscar post.", code: "FETCH_ERROR" },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado ou não pertence a esta empresa.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Deletar post
    const { error: deleteError } = await supabase
      .from("collected_posts")
      .delete()
      .eq("id", postId)
      .eq("company_id", access.companyId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Falha ao deletar post.", code: "DELETE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Post deletado com sucesso!",
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "DELETE_POST_ERROR" }, { status: 500 });
  }
}
