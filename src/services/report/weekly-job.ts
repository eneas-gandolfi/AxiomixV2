/**
 * Arquivo: src/services/report/weekly-job.ts
 * Propósito: Executar ciclo completo do relatorio semanal (gerar, enviar e registrar).
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import type { Json } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyReport, type WeeklyPeriod } from "@/services/report/generator";
import { sendWeeklyReport } from "@/services/report/whatsapp-sender";

type RunWeeklyReportJobInput = {
  companyId: string;
  jobId?: string;
  period?: Partial<WeeklyPeriod>;
};

type RunWeeklyReportJobResult = {
  companyId: string;
  weekStart: string;
  weekEnd: string;
  reportText: string;
  managerPhone?: string;
  deliveryStatus: "sent" | "failed";
  deliveryError?: string;
};

async function upsertWeeklyReportRecord(input: {
  companyId: string;
  jobId?: string;
  period: WeeklyPeriod;
  reportText: string;
  sentTo?: string;
  deliveryStatus: "sent" | "failed";
  deliveryResponse: Json;
}) {
  const supabase = createSupabaseAdminClient();
  const weekStartDate = input.period.weekStartIso.slice(0, 10);
  const weekEndDate = input.period.weekEndIso.slice(0, 10);

  await supabase.from("weekly_reports").upsert(
    {
      company_id: input.companyId,
      job_id: input.jobId ?? null,
      week_start: weekStartDate,
      week_end: weekEndDate,
      report_text: input.reportText,
      sent_to: input.sentTo ?? null,
      delivery_status: input.deliveryStatus,
      delivery_response: input.deliveryResponse,
      sent_at: new Date().toISOString(),
    },
    {
      onConflict: "company_id,week_start,week_end",
    }
  );
}

export async function runWeeklyReportJob(
  input: RunWeeklyReportJobInput
): Promise<RunWeeklyReportJobResult> {
  const generated = await generateWeeklyReport(input.companyId, input.period);

  try {
    const delivery = await sendWeeklyReport(input.companyId, generated.reportText);
    await upsertWeeklyReportRecord({
      companyId: input.companyId,
      jobId: input.jobId,
      period: generated.period,
      reportText: generated.reportText,
      sentTo: delivery.managerPhone,
      deliveryStatus: "sent",
      deliveryResponse: {
        providerStatus: delivery.providerStatus,
        providerBody: delivery.providerBody,
      },
    });

    return {
      companyId: input.companyId,
      weekStart: generated.period.weekStartIso,
      weekEnd: generated.period.weekEndIso,
      reportText: generated.reportText,
      managerPhone: delivery.managerPhone,
      deliveryStatus: "sent",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha de envio.";
    await upsertWeeklyReportRecord({
      companyId: input.companyId,
      jobId: input.jobId,
      period: generated.period,
      reportText: generated.reportText,
      deliveryStatus: "failed",
      deliveryResponse: {
        error: detail,
      },
    });

    return {
      companyId: input.companyId,
      weekStart: generated.period.weekStartIso,
      weekEnd: generated.period.weekEndIso,
      reportText: generated.reportText,
      deliveryStatus: "failed",
      deliveryError: detail,
    };
  }
}

export type { RunWeeklyReportJobResult };
