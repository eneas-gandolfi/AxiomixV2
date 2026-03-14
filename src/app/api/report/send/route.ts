/**
 * Arquivo: src/app/api/report/send/route.ts
 * Proposito: Enfileirar ou enviar manualmente o relatorio semanal via WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { enqueueJob } from "@/lib/jobs/queue";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { runWeeklyReportJob } from "@/services/report/weekly-job";

export const dynamic = "force-dynamic";

const reportSendSchema = z.object({
  companyId: z.string().uuid("companyId invalido.").optional(),
  weekStartIso: z.string().datetime("weekStartIso invalido.").optional(),
  weekEndIso: z.string().datetime("weekEndIso invalido.").optional(),
  mode: z.enum(["send_now", "enqueue"]).default("send_now"),
});

function isCronRequest(request: NextRequest) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(vercelCronHeader) || (Boolean(cronSecret) && cronSecretHeader === cronSecret);
}

async function enqueueForAllCompanies(period: { weekStartIso?: string; weekEndIso?: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas para enfileirar relatorio.");
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
      "weekly_report",
      {
        weekStartIso: period.weekStartIso,
        weekEndIso: period.weekEndIso,
      },
      companyId
    );
    enqueued += 1;
  }

  return {
    enqueued,
    companyIds,
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isCronRequest(request)) {
      return NextResponse.json(
        { error: "Metodo GET reservado para cron.", code: "METHOD_NOT_ALLOWED" },
        { status: 405 }
      );
    }

    const result = await enqueueForAllCompanies({});
    return NextResponse.json({
      mode: "cron_enqueue",
      enqueued: result.enqueued,
      companyIds: result.companyIds,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "REPORT_SEND_GET_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = reportSendSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const period = {
      weekStartIso: parsed.data.weekStartIso,
      weekEndIso: parsed.data.weekEndIso,
    };

    if (isCronRequest(request)) {
      const result = await enqueueForAllCompanies(period);
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
        { error: "Apenas owner/admin podem enviar relatorio manual.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (parsed.data.mode === "enqueue") {
      const enqueued = await enqueueJob(
        "weekly_report",
        {
          weekStartIso: period.weekStartIso,
          weekEndIso: period.weekEndIso,
        },
        access.companyId
      );

      return NextResponse.json({
        mode: "manual_enqueue",
        companyId: access.companyId,
        job: enqueued,
      });
    }

    const result = await runWeeklyReportJob({
      companyId: access.companyId,
      period,
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
    return NextResponse.json({ error: detail, code: "REPORT_SEND_ERROR" }, { status: 500 });
  }
}
