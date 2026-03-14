/**
 * Arquivo: src/app/api/whatsapp/critical-count/route.ts
 * Proposito: Retornar contagem de conversas críticas (negativas nas últimas 24h).
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";

export const dynamic = "force-dynamic";

const countSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = countSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Buscar conversas negativas das últimas 24h
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count, error } = await supabase
      .from("conversation_insights")
      .select("id", { count: "exact", head: true })
      .eq("company_id", access.companyId)
      .eq("sentiment", "negativo")
      .gte("generated_at", oneDayAgo.toISOString());

    if (error) {
      throw new Error(`Falha ao contar conversas críticas: ${error.message}`);
    }

    return NextResponse.json({
      companyId: access.companyId,
      count: count ?? 0,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "CRITICAL_COUNT_ERROR" }, { status: 500 });
  }
}
