/**
 * Arquivo: src/app/api/rag/query/route.ts
 * Propósito: Receber pergunta e retornar resposta baseada nos documentos RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { queryKnowledgeBase } from "@/services/rag/query";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  companyId: z.string().uuid().optional(),
  question: z
    .string()
    .min(3, "Pergunta muito curta.")
    .max(2000, "Pergunta muito longa (max 2000 caracteres)."),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "RAG_QUERY_ERROR" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyIpRateLimit(request, "ai:rag", 20, 60);
    if (rateLimited) return rateLimited;

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Body inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const result = await queryKnowledgeBase(access.companyId, parsed.data.question);

    return NextResponse.json({
      companyId: access.companyId,
      answer: result.answer,
      sources: result.sources.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        content: s.content.slice(0, 300),
        chunkIndex: s.chunkIndex,
        similarity: Math.round(s.similarity * 100) / 100,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
