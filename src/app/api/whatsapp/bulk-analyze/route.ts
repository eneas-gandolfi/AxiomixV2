/**
 * Arquivo: src/app/api/whatsapp/bulk-analyze/route.ts
 * Propósito: Enfileirar analise em lote para conversas pendentes e processar imediatamente.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { processJobs } from "@/lib/jobs/processor";
import { enqueueAutoAnalyses } from "@/services/whatsapp/auto-analyze";

export const dynamic = "force-dynamic";

const bulkAnalyzeSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = bulkAnalyzeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const queued = await enqueueAutoAnalyses(access.companyId);
    const processLimit = Math.min(queued.enqueuedAnalyses, 10);
    const processingSummary =
      processLimit > 0
        ? await processJobs({
            companyId: access.companyId,
            maxJobs: processLimit,
          })
        : { processed: 0, jobs: [] as Array<{ jobType: string; status: string }> };

    const processedNow = processingSummary.jobs.filter(
      (job) => job.jobType === "whatsapp_analyze" && job.status === "done"
    ).length;
    const failedNow = processingSummary.jobs.filter(
      (job) => job.jobType === "whatsapp_analyze" && job.status === "failed"
    ).length;

    const message =
      queued.enqueuedAnalyses === 0
        ? "Todas as conversas ja foram analisadas."
        : failedNow > 0
          ? `${processedNow} analise(s) concluida(s) e ${failedNow} falha(s).`
          : `${processedNow} analise(s) concluida(s) agora.`;

    return NextResponse.json({
      companyId: access.companyId,
      scannedConversations: queued.scannedConversations,
      enqueuedAnalyses: queued.enqueuedAnalyses,
      jobIds: queued.jobIds,
      processedNow,
      failedNow,
      message,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "BULK_ANALYZE_ERROR" }, { status: 500 });
  }
}
