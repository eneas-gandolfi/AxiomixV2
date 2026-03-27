/**
 * Arquivo: src/services/campaigns/executor.ts
 * Propósito: Executor de envio em lote de templates WhatsApp com throttling e controle de status.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";
import {
  getCampaign,
  updateCampaignStats,
  setCampaignCompleted,
  setCampaignFailed,
} from "@/services/campaigns/manager";
import { scheduleCampaignBatch } from "@/services/campaigns/qstash";
import type { CampaignStats } from "@/types/modules/campaigns.types";
import type { Json } from "@/database/types/database.types";

function recipientsTable() {
  return createSupabaseAdminClient().from("campaign_recipients");
}

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBodyParams(
  templates: string[],
  variables: Record<string, string>
): string[] {
  return templates.map((tpl) =>
    tpl.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (_match, key: string) => {
      return variables[key] ?? variables[key.split(".").pop() ?? ""] ?? "";
    })
  );
}

function buildTemplateComponents(
  bodyParams: string[],
  headerParams: string[]
): Json {
  const components: Record<string, string[]> = {};

  if (bodyParams.length > 0) {
    components.body_params = bodyParams;
  }

  if (headerParams.length > 0) {
    components.header_params = headerParams;
  }

  return components as unknown as Json;
}

export async function processCampaignBatch(
  campaignId: string,
  companyId: string
): Promise<{ processed: number; remaining: number }> {
  // Verificar status atual da campanha
  let campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "running") {
    console.log(`[CAMPAIGN] Campanha ${campaignId} não está running (status: ${campaign.status}). Abortando batch.`);
    return { processed: 0, remaining: 0 };
  }

  // Buscar próximos recipients pendentes
  const { data: pendingRecipients, error: fetchError } = await recipientsTable()
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error(`[CAMPAIGN] Falha ao buscar recipients:`, fetchError.message);
    await setCampaignFailed(campaignId, fetchError.message);
    return { processed: 0, remaining: 0 };
  }

  const recipients = (pendingRecipients ?? []) as Array<Record<string, unknown>>;

  if (recipients.length === 0) {
    await setCampaignCompleted(campaignId);
    return { processed: 0, remaining: 0 };
  }

  let sofiaClient;
  try {
    sofiaClient = await getSofiaCrmClient(companyId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao conectar Sofia CRM";
    console.error(`[CAMPAIGN] Falha ao obter cliente Sofia:`, msg);
    await setCampaignFailed(campaignId, msg);
    return { processed: 0, remaining: 0 };
  }

  const stats: CampaignStats = { ...campaign.stats };
  let processed = 0;

  for (const recipient of recipients) {
    // Re-checar status da campanha a cada 5 envios para detectar pausa
    if (processed > 0 && processed % 5 === 0) {
      campaign = await getCampaign(campaignId, companyId);
      if (campaign.status !== "running") {
        console.log(`[CAMPAIGN] Campanha ${campaignId} foi pausada durante execução.`);
        await updateCampaignStats(campaignId, stats);
        break;
      }
    }

    const variables = (recipient.variables as Record<string, string>) ?? {};
    const bodyParams = resolveBodyParams(campaign.body_params_template, variables);
    const headerParams = resolveBodyParams(campaign.header_params_template, variables);

    try {
      await sofiaClient.sendTemplate({
        to: recipient.contact_phone as string,
        templateName: campaign.template_name,
        language: campaign.language,
        components: buildTemplateComponents(bodyParams, headerParams),
      });

      await recipientsTable()
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recipient.id as string);

      stats.sent++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";

      await recipientsTable()
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", recipient.id as string);

      stats.failed++;
      console.error(`[CAMPAIGN] Falha ao enviar para ${recipient.contact_phone}:`, errorMsg);
    }

    processed++;

    // Throttle entre envios
    if (processed < recipients.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Atualizar stats no banco
  await updateCampaignStats(campaignId, stats);

  // Verificar se ainda há pending e a campanha continua running
  const { count: remainingCount } = await recipientsTable()
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  const remaining = remainingCount ?? 0;

  if (remaining > 0) {
    // Re-checar status antes de agendar próximo batch
    const currentCampaign = await getCampaign(campaignId, companyId);
    if (currentCampaign.status === "running") {
      await scheduleCampaignBatch({ campaignId, companyId });
    }
  } else {
    await setCampaignCompleted(campaignId);
  }

  return { processed, remaining };
}
