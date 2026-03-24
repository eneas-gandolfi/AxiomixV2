/**
 * Arquivo: src/app/api/whatsapp/bulk-analyze-status/route.ts
 * Propósito: Consultar status de jobs de análise em lote para polling do client.
 * Autor: AXIOMIX
 * Data: 2026-03-24
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  jobIds: z.string().min(1, "jobIds obrigatório."),
});

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const parsed = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
      jobIds: request.nextUrl.searchParams.get("jobIds") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Query inválida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const jobIds = parsed.data.jobIds.split(",").filter(Boolean).slice(0, 50);

    if (jobIds.length === 0) {
      return NextResponse.json({ pending: 0, running: 0, done: 0, failed: 0, total: 0 });
    }

    const adminSupabase = createSupabaseAdminClient();
    const { data: jobs, error } = await adminSupabase
      .from("async_jobs")
      .select("status")
      .eq("company_id", access.companyId)
      .eq("job_type", "whatsapp_analyze")
      .in("id", jobIds);

    if (error) {
      throw new Error(`Falha ao consultar status dos jobs: ${error.message}`);
    }

    const rows = jobs ?? [];
    const counts = {
      pending: 0,
      running: 0,
      done: 0,
      failed: 0,
      total: rows.length,
    };

    for (const row of rows) {
      if (row.status === "pending") counts.pending += 1;
      else if (row.status === "running") counts.running += 1;
      else if (row.status === "done") counts.done += 1;
      else if (row.status === "failed") counts.failed += 1;
    }

    return NextResponse.json(counts);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "BULK_ANALYZE_STATUS_ERROR" }, { status: 500 });
  }
}
