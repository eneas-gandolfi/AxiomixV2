/**
 * Arquivo: src/services/report/whatsapp-sender.ts
 * Proposito: Enviar relatorio semanal para o WhatsApp do gestor via Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    throw new Error("Falha ao carregar integracao Evolution API.");
  }
  if (!integration?.config) {
    throw new Error("Integracao Evolution API nao configurada para esta empresa.");
  }

  const decoded = decodeIntegrationConfig("evolution_api", integration.config);
  if (!decoded.managerPhone) {
    throw new Error("Numero do gestor nao configurado para esta empresa.");
  }

  const baseUrl = decoded.baseUrl?.replace(/\/+$/, "");
  const apiKey = decoded.apiKey;
  if (!baseUrl || !apiKey) {
    throw new Error("Credenciais da Evolution API nao configuradas no servidor.");
  }

  return {
    baseUrl,
    apiKey,
    managerPhone: decoded.managerPhone,
  };
}

export async function sendWeeklyReport(
  companyId: string,
  reportText: string
): Promise<SendWeeklyReportResult> {
  const config = await resolveEvolutionConfig(companyId);
  const response = await fetch(`${config.baseUrl}/message/sendText`, {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: config.managerPhone,
      text: reportText,
    }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`Falha no envio WhatsApp: ${response.status} ${responseBody.slice(0, 180)}`);
  }

  return {
    managerPhone: config.managerPhone,
    providerStatus: response.status,
    providerBody: responseBody.slice(0, 500),
  };
}

export type { SendWeeklyReportResult };
