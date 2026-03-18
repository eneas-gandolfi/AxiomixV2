/**
 * Arquivo: src/services/report/daily-job.ts
 * Propósito: Executar ciclo completo do relatorio diario (gerar, enviar e registrar).
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

import "server-only";

import type { Json } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateDailyReport } from "@/services/report/daily-generator";
import { sendWeeklyReport } from "@/services/report/whatsapp-sender";

type RunDailyReportJobInput = {
  companyId: string;
  jobId?: string;
  reportDate?: string;
};

type RunDailyReportJobResult = {
  companyId: string;
  reportDate: string;
  reportText: string;
  managerPhone?: string;
  deliveryStatus: "sent" | "failed";
  deliveryError?: string;
};

async function upsertDailyReportRecord(input: {
  companyId: string;
  jobId?: string;
  reportDate: string;
  reportText: string;
  sentTo?: string;
  deliveryStatus: "sent" | "failed";
  deliveryResponse: Json;
}) {
  const supabase = createSupabaseAdminClient();

  await supabase.from("daily_reports").upsert(
    {
      company_id: input.companyId,
      job_id: input.jobId ?? null,
      report_date: input.reportDate,
      report_text: input.reportText,
      sent_to: input.sentTo ?? null,
      delivery_status: input.deliveryStatus,
      delivery_response: input.deliveryResponse,
      sent_at: new Date().toISOString(),
    },
    {
      onConflict: "company_id,report_date",
    }
  );
}

export async function runDailyReportJob(
  input: RunDailyReportJobInput
): Promise<RunDailyReportJobResult> {
  const generated = await generateDailyReport(input.companyId, input.reportDate);

  try {
    const delivery = await sendWeeklyReport(input.companyId, generated.reportText);
    await upsertDailyReportRecord({
      companyId: input.companyId,
      jobId: input.jobId,
      reportDate: generated.reportDate,
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
      reportDate: generated.reportDate,
      reportText: generated.reportText,
      managerPhone: delivery.managerPhone,
      deliveryStatus: "sent",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Falha de envio.";
    await upsertDailyReportRecord({
      companyId: input.companyId,
      jobId: input.jobId,
      reportDate: generated.reportDate,
      reportText: generated.reportText,
      deliveryStatus: "failed",
      deliveryResponse: {
        error: detail,
      },
    });

    return {
      companyId: input.companyId,
      reportDate: generated.reportDate,
      reportText: generated.reportText,
      deliveryStatus: "failed",
      deliveryError: detail,
    };
  }
}

export type { RunDailyReportJobResult };
