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
import { sendWeeklyReport, sendWeeklyReportPdf } from "@/services/report/whatsapp-sender";
import { generateWeeklyReportPdf } from "@/services/report/pdf-generator";

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
  pdfStoragePath?: string;
  pdfPublicUrl?: string;
};

async function upsertWeeklyReportRecord(input: {
  companyId: string;
  jobId?: string;
  period: WeeklyPeriod;
  reportText: string;
  sentTo?: string;
  deliveryStatus: "sent" | "failed";
  deliveryResponse: Json;
  pdfStoragePath?: string;
  pdfPublicUrl?: string;
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
      pdf_storage_path: input.pdfStoragePath ?? null,
      pdf_public_url: input.pdfPublicUrl ?? null,
    },
    {
      onConflict: "company_id,week_start,week_end",
    }
  );
}

const STORAGE_BUCKET = "reports";

async function uploadPdfToStorage(
  companyId: string,
  pdfBuffer: Buffer,
  fileName: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createSupabaseAdminClient();
  const storagePath = `${companyId}/${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload do PDF: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath: `${STORAGE_BUCKET}/${storagePath}`,
    publicUrl: urlData.publicUrl,
  };
}

export async function runWeeklyReportJob(
  input: RunWeeklyReportJobInput
): Promise<RunWeeklyReportJobResult> {
  const generated = await generateWeeklyReport(input.companyId, input.period);

  const weekStart = generated.period.weekStartIso.slice(0, 10);
  const weekEnd = generated.period.weekEndIso.slice(0, 10);
  const pdfFileName = `weekly-${weekStart}-${weekEnd}.pdf`;

  // PDF generation & upload — best-effort (não bloqueia o envio do texto)
  let pdfStoragePath: string | undefined;
  let pdfPublicUrl: string | undefined;
  let pdfBuffer: Buffer | undefined;

  try {
    pdfBuffer = await generateWeeklyReportPdf(
      generated.metrics,
      generated.period,
      generated.reportText
    );

    const uploaded = await uploadPdfToStorage(
      input.companyId,
      pdfBuffer,
      pdfFileName
    );
    pdfStoragePath = uploaded.storagePath;
    pdfPublicUrl = uploaded.publicUrl;
  } catch (pdfError) {
    console.error(
      "[WeeklyJob] Falha na geração/upload do PDF (best-effort):",
      pdfError instanceof Error ? pdfError.message : pdfError
    );
  }

  try {
    // Enviar texto pelo WhatsApp
    const delivery = await sendWeeklyReport(input.companyId, generated.reportText);

    // Enviar PDF como documento pelo WhatsApp — best-effort
    if (pdfBuffer) {
      try {
        await sendWeeklyReportPdf(input.companyId, pdfBuffer, pdfFileName);
      } catch (pdfSendError) {
        console.error(
          "[WeeklyJob] Falha no envio do PDF via WhatsApp (best-effort):",
          pdfSendError instanceof Error ? pdfSendError.message : pdfSendError
        );
      }
    }

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
      pdfStoragePath,
      pdfPublicUrl,
    });

    return {
      companyId: input.companyId,
      weekStart: generated.period.weekStartIso,
      weekEnd: generated.period.weekEndIso,
      reportText: generated.reportText,
      managerPhone: delivery.managerPhone,
      deliveryStatus: "sent",
      pdfStoragePath,
      pdfPublicUrl,
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
      pdfStoragePath,
      pdfPublicUrl,
    });

    return {
      companyId: input.companyId,
      weekStart: generated.period.weekStartIso,
      weekEnd: generated.period.weekEndIso,
      reportText: generated.reportText,
      deliveryStatus: "failed",
      deliveryError: detail,
      pdfStoragePath,
      pdfPublicUrl,
    };
  }
}

export type { RunWeeklyReportJobResult };
