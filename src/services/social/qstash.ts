/**
 * Arquivo: src/services/social/qstash.ts
 * Propósito: Integrar agendamento e cancelamento de mensagens com QStash.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import { Client } from "@upstash/qstash";

type SchedulePublishPayload = {
  scheduledPostId: string;
  companyId: string;
  scheduledAtIso: string;
};

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN não configurado.");
  }

  return new Client({
    token,
  });
}

function resolveAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL não configurada.");
  }

  return appUrl.replace(/\/+$/, "");
}

export function resolveSocialPublishUrl() {
  return `${resolveAppUrl()}/api/social/publish`;
}

function resolveNotBeforeSeconds(scheduledAtIso: string) {
  const scheduledDate = new Date(scheduledAtIso);
  const nowSeconds = Math.floor(Date.now() / 1000) + 1;

  if (Number.isNaN(scheduledDate.getTime())) {
    return nowSeconds;
  }

  return Math.max(Math.floor(scheduledDate.getTime() / 1000), nowSeconds);
}

export async function scheduleSocialPublish(payload: SchedulePublishPayload) {
  const qstash = getQStashClient();
  const publishUrl = resolveSocialPublishUrl();
  const result = await qstash.publishJSON({
    url: publishUrl,
    body: {
      scheduledPostId: payload.scheduledPostId,
      companyId: payload.companyId,
    },
    notBefore: resolveNotBeforeSeconds(payload.scheduledAtIso),
    retries: 3,
    timeout: 30,
    label: "axiomix-social-publish",
  });

  return {
    messageId: result.messageId,
    url: publishUrl,
  };
}

export async function cancelScheduledMessage(messageId: string) {
  const qstash = getQStashClient();
  await qstash.messages.delete(messageId);
}
