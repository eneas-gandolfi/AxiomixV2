/**
 * Arquivo: src/app/api/social/approval/[token]/route.ts
 * Propósito: API pública para aprovar/rejeitar uma demanda via token.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { approveViaToken, getDemand, ContentDemandError } from "@/services/social/content-demands";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

const actionSchema = z.object({
  action: z.enum(["aprovado", "alteracoes_solicitadas"]),
  comment: z.string().max(500).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof ContentDemandError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "APPROVAL_ERROR" }, { status: 500 });
}

/**
 * GET: Buscar dados da demanda para exibir na página pública de aprovação.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await applyIpRateLimit(_request, "approval:get", 20, 60);
    if (rateLimited) return rateLimited;

    const { token } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data: row, error } = await supabase
      .from("content_demands")
      .select("id, company_id, title, description, caption, platforms, media_file_ids, status, approval_token_expires_at")
      .eq("approval_token", token)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { error: "Token de aprovação inválido.", code: "INVALID_APPROVAL_TOKEN" },
        { status: 404 }
      );
    }

    if (
      row.approval_token_expires_at &&
      new Date(row.approval_token_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Token de aprovação expirado.", code: "EXPIRED_APPROVAL_TOKEN" },
        { status: 410 }
      );
    }

    // Get media URLs
    let mediaFiles: Array<{ id: string; publicUrl: string }> = [];
    if (row.media_file_ids && row.media_file_ids.length > 0) {
      const { data: mediaRows } = await supabase
        .from("media_files")
        .select("id, public_url")
        .in("id", row.media_file_ids);

      mediaFiles = (mediaRows ?? []).map((m) => ({
        id: m.id,
        publicUrl: m.public_url,
      }));
    }

    return NextResponse.json({
      demand: {
        id: row.id,
        title: row.title,
        description: row.description,
        caption: row.caption,
        platforms: row.platforms,
        status: row.status,
      },
      mediaFiles,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST: Executar ação de aprovação ou solicitação de alterações.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await applyIpRateLimit(request, "approval:post", 10, 60);
    if (rateLimited) return rateLimited;

    const { token } = await context.params;
    const body: unknown = await request.json();

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const demand = await approveViaToken(token, parsed.data.action, parsed.data.comment);

    return NextResponse.json({ ok: true, demand });
  } catch (error) {
    return errorResponse(error);
  }
}
