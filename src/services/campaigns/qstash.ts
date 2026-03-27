/**
 * Arquivo: src/services/campaigns/qstash.ts
 * Propósito: Integrar agendamento de batches de campanha com QStash.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import "server-only";

import { Client } from "@upstash/qstash";

type ScheduleCampaignBatchPayload = {
  campaignId: string;
  companyId: string;
};

type ScheduleCampaignPayload = {
  campaignId: string;
  companyId: string;
  scheduledAtIso: string;
};

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN não configurado.");
  }

  return new Client({ token });
}

function resolveAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL não configurada.");
  }

  return appUrl.replace(/\/+$/, "");
}

export function resolveCampaignProcessUrl() {
  return `${resolveAppUrl()}/api/campaigns/process`;
}

export async function scheduleCampaignBatch(payload: ScheduleCampaignBatchPayload) {
  const qstash = getQStashClient();
  const processUrl = resolveCampaignProcessUrl();

  const result = await qstash.publishJSON({
    url: processUrl,
    body: {
      campaignId: payload.campaignId,
      companyId: payload.companyId,
    },
    retries: 3,
    timeout: 120,
    label: "axiomix-campaign-batch",
  });

  return {
    messageId: result.messageId,
    url: processUrl,
  };
}

export async function scheduleDelayedCampaign(payload: ScheduleCampaignPayload) {
  const qstash = getQStashClient();
  const processUrl = resolveCampaignProcessUrl();

  const scheduledDate = new Date(payload.scheduledAtIso);
  const nowSeconds = Math.floor(Date.now() / 1000) + 1;
  const notBefore = Number.isNaN(scheduledDate.getTime())
    ? nowSeconds
    : Math.max(Math.floor(scheduledDate.getTime() / 1000), nowSeconds);

  const result = await qstash.publishJSON({
    url: processUrl,
    body: {
      campaignId: payload.campaignId,
      companyId: payload.companyId,
    },
    notBefore,
    retries: 3,
    timeout: 120,
    label: "axiomix-campaign-scheduled",
  });

  return {
    messageId: result.messageId,
    url: processUrl,
  };
}

export async function cancelCampaignMessage(messageId: string) {
  const qstash = getQStashClient();
  await qstash.messages.delete(messageId);
}
