/**
 * Arquivo: src/app/api/whatsapp/bulk-analyze/route.ts
 * Proposito: Enfileirar análise em lote para conversas pendentes.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { enqueueAutoAnalyses } from "@/services/whatsapp/auto-analyze";

export const dynamic = "force-dynamic";

const bulkAnalyzeSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = bulkAnalyzeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Enfileirar análises automáticas
    const result = await enqueueAutoAnalyses(access.companyId);

    return NextResponse.json({
      companyId: access.companyId,
      scannedConversations: result.scannedConversations,
      enqueuedAnalyses: result.enqueuedAnalyses,
      jobIds: result.jobIds,
      message:
        result.enqueuedAnalyses > 0
          ? `${result.enqueuedAnalyses} análise(s) enfileirada(s). Aguarde o processamento.`
          : "Todas as conversas já foram analisadas.",
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "BULK_ANALYZE_ERROR" }, { status: 500 });
  }
}
