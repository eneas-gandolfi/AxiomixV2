/**
 * Arquivo: src/app/api/cron/whatsapp-batch/route.ts
 * Proposito: Cron horario para analise batch de conversas WhatsApp (classificacao leve + resumo).
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { runBatchAnalysis, type BatchAnalysisResult } from "@/services/whatsapp/batch-analyzer";
import { isCronAuthorized } from "@/lib/auth/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const manualSchema = z.object({
  companyId: z.string().uuid("companyId invalido."),
});

async function getAllActiveCompanyIds(): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas.");
  }

  return Array.from(
    new Set(
      (memberships ?? [])
        .map((item) => item.company_id)
        .filter((value): value is string => typeof value === "string")
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const companyIds = await getAllActiveCompanyIds();
    const results: Array<BatchAnalysisResult & { error?: string }> = [];

    for (const companyId of companyIds) {
      try {
        const result = await runBatchAnalysis(companyId);
        results.push(result);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Erro inesperado.";
        results.push({
          companyId,
          conversationsAnalyzed: 0,
          purchaseIntents: 0,
          negativeSentiments: 0,
          summaryText: "",
          periodStart: "",
          periodEnd: "",
          error: detail,
        });
      }
    }

    return NextResponse.json({
      mode: "cron",
      companies: companyIds.length,
      results,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "WHATSAPP_BATCH_CRON_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = manualSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem executar analise batch.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const result = await runBatchAnalysis(access.companyId);

    return NextResponse.json({
      mode: "manual",
      result,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "WHATSAPP_BATCH_ERROR" },
      { status: 500 }
    );
  }
}
