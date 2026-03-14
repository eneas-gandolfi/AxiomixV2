/**
 * Arquivo: src/app/api/whatsapp/analyze/route.ts
 * Proposito: Analisar conversa do WhatsApp com IA e salvar insight.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { analyzeConversation } from "@/services/whatsapp/analyzer";

export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
  conversationId: z.string().uuid("conversationId invalido."),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = analyzeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const insight = await analyzeConversation(access.companyId, parsed.data.conversationId);

    return NextResponse.json({
      insight,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "WHATSAPP_ANALYZE_ERROR" }, { status: 500 });
  }
}
