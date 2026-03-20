/**
 * Arquivo: src/services/report/whatsapp-sender.ts
 * Propósito: Enviar relatório semanal para o WhatsApp do gestor via Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  resolvePreferredEvolutionInstance,
  resolveEvolutionCredentials,
  sendEvolutionTextMessage,
  sendEvolutionMediaMessage,
} from "@/services/integrations/evolution";

type SendWeeklyReportResult = {
  managerPhone: string;
  providerStatus: number;
  providerBody: string;
};

async function resolveEvolutionConfig(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "evolution_api")
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao carregar integração Evolution API.");
  }
  if (!integration?.config) {
    throw new Error("Integração Evolution API não configurada para esta empresa.");
  }

  const decoded = decodeIntegrationConfig("evolution_api", integration.config);
  if (!decoded.managerPhone) {
    throw new Error("Número do gestor não configurado para esta empresa.");
  }

  const instanceName = resolvePreferredEvolutionInstance(decoded.vendors);

  if (!instanceName) {
    throw new Error("Nenhuma instância conectada na Evolution API.");
  }

  const credentials = resolveEvolutionCredentials({
    baseUrl: decoded.baseUrl,
    apiKey: decoded.apiKey,
  });

  return {
    credentials,
    instanceName,
    managerPhone: decoded.managerPhone,
  };
}

export async function sendWeeklyReport(
  companyId: string,
  reportText: string
): Promise<SendWeeklyReportResult> {
  const config = await resolveEvolutionConfig(companyId);
  const result = await sendEvolutionTextMessage({
    credentials: config.credentials,
    instanceName: config.instanceName,
    number: config.managerPhone,
    text: reportText,
  });

  return {
    managerPhone: config.managerPhone,
    providerStatus: result.providerStatus,
    providerBody: result.providerBody,
  };
}

type SendWeeklyReportPdfResult = {
  managerPhone: string;
  providerStatus: number;
  providerBody: string;
};

export async function sendWeeklyReportPdf(
  companyId: string,
  pdfBuffer: Buffer,
  fileName: string
): Promise<SendWeeklyReportPdfResult> {
  const config = await resolveEvolutionConfig(companyId);
  const mediaBase64 = pdfBuffer.toString("base64");

  const result = await sendEvolutionMediaMessage({
    credentials: config.credentials,
    instanceName: config.instanceName,
    number: config.managerPhone,
    mediaBase64,
    mediatype: "document",
    fileName,
    caption: "Relatório Semanal AXIOMIX",
  });

  return {
    managerPhone: config.managerPhone,
    providerStatus: result.providerStatus,
    providerBody: result.providerBody,
  };
}

export type { SendWeeklyReportResult, SendWeeklyReportPdfResult };
