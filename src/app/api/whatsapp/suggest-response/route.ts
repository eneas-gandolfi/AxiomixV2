/**
 * Arquivo: src/app/api/whatsapp/suggest-response/route.ts
 * Propósito: Gerar sugestão de resposta IA para o atendente.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { generateResponseSuggestion } from "@/services/whatsapp/response-suggester";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const suggestSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  conversationId: z.string().uuid("conversationId inválido."),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyIpRateLimit(request, "ai:suggest", 30, 60);
    if (rateLimited) return rateLimited;

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = suggestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const suggestion = await generateResponseSuggestion(
      access.companyId,
      parsed.data.conversationId
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "SUGGEST_RESPONSE_ERROR" }, { status: 500 });
  }
}
