/**
 * Arquivo: src/app/api/report/daily/route.ts
 * Propósito: Enfileirar ou enviar manualmente o relatório diário de gargalos via WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { enqueueJob } from "@/lib/jobs/queue";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { runDailyReportJob } from "@/services/report/daily-job";
import { isCronAuthorized } from "@/lib/auth/cron-auth";

export const dynamic = "force-dynamic";

const dailyReportSchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "reportDate deve ser YYYY-MM-DD.")
    .optional(),
  mode: z.enum(["send_now", "enqueue"]).default("send_now"),
});

async function enqueueForAllCompanies(reportDate?: string) {
  const supabase = createSupabaseAdminClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas para enfileirar relatório diário.");
  }

  const companyIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((item) => item.company_id)
        .filter((value): value is string => typeof value === "string")
    )
  );

  let enqueued = 0;
  for (const companyId of companyIds) {
    await enqueueJob(
      "daily_report",
      { reportDate },
      companyId
    );
    enqueued += 1;
  }

  return { enqueued, companyIds };
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Método GET reservado para cron.", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    const result = await enqueueForAllCompanies();
    return NextResponse.json({
      mode: "cron_enqueue",
      enqueued: result.enqueued,
      companyIds: result.companyIds,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "DAILY_REPORT_GET_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = dailyReportSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { reportDate } = parsed.data;

    if (isCronAuthorized(request)) {
      const result = await enqueueForAllCompanies(reportDate);
      return NextResponse.json({
        mode: "cron_enqueue",
        enqueued: result.enqueued,
        companyIds: result.companyIds,
      });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner/admin podem enviar relatório diário manual.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (parsed.data.mode === "enqueue") {
      const enqueued = await enqueueJob(
        "daily_report",
        { reportDate },
        access.companyId
      );

      return NextResponse.json({
        mode: "manual_enqueue",
        companyId: access.companyId,
        job: enqueued,
      });
    }

    const result = await runDailyReportJob({
      companyId: access.companyId,
      reportDate,
    });

    return NextResponse.json({
      mode: "manual_send_now",
      companyId: access.companyId,
      result,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "DAILY_REPORT_SEND_ERROR" }, { status: 500 });
  }
}
