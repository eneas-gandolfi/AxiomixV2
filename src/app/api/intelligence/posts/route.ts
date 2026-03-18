/**
 * Arquivo: src/app/api/intelligence/posts/route.ts
 * Propósito: API para adicionar posts manualmente ao Content Radar (curadoria manual)
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const addPostSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  platform: z.enum(["instagram", "linkedin", "tiktok"], {
    message: "Plataforma deve ser instagram, linkedin ou tiktok.",
  }),
  postUrl: z.string().url("URL inválida.").optional().or(z.literal("")),
  content: z.string().trim().min(10, "Conteúdo deve ter pelo menos 10 caracteres.").max(5000),
  likesCount: z.number().int().min(0).default(0),
  commentsCount: z.number().int().min(0).default(0),
  sharesCount: z.number().int().min(0).default(0),
  postedAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = addPostSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Calcular engagement score
    const engagementScore =
      parsed.data.likesCount + parsed.data.commentsCount * 2 + parsed.data.sharesCount * 3;

    // Inserir post
    const { data: post, error: insertError } = await supabase
      .from("collected_posts")
      .insert({
        company_id: access.companyId,
        source_type: "radar",
        competitor_id: null,
        platform: parsed.data.platform,
        post_url: parsed.data.postUrl || null,
        content: parsed.data.content,
        likes_count: parsed.data.likesCount,
        comments_count: parsed.data.commentsCount,
        shares_count: parsed.data.sharesCount,
        engagement_score: engagementScore,
        posted_at: parsed.data.postedAt || new Date().toISOString(),
        collected_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Falha ao adicionar post.", code: "INSERT_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: post.id,
      engagementScore,
      message: "Post adicionado com sucesso!",
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "ADD_POST_ERROR" }, { status: 500 });
  }
}
