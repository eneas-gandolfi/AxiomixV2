/**
 * Arquivo: src/services/alerts/alert-triggers.ts
 * Propósito: Funcoes fire-and-forget para disparar alertas a partir dos servicos existentes.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import "server-only";

import { dispatchAlert } from "@/services/alerts/alert-dispatcher";
import {
  buildPurchaseIntentMessage,
  buildNegativeSentimentMessage,
  buildFailedPostMessage,
  buildViralContentMessage,
} from "@/services/alerts/alert-messages";

export function triggerPurchaseIntentAlert(input: {
  companyId: string;
  conversationId: string;
  contactName: string | null;
  contactPhone: string | null;
  summary: string;
}): void {
  const message = buildPurchaseIntentMessage({
    companyId: input.companyId,
    conversationId: input.conversationId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    summary: input.summary,
  });

  dispatchAlert({
    companyId: input.companyId,
    alertType: "purchase_intent",
    sourceId: input.conversationId,
    messageText: message,
  }).catch(() => {});
}

export function triggerNegativeSentimentAlert(input: {
  companyId: string;
  conversationId: string;
  contactName: string | null;
  contactPhone: string | null;
  urgency: number;
  summary: string;
}): void {
  const message = buildNegativeSentimentMessage({
    companyId: input.companyId,
    conversationId: input.conversationId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    urgency: input.urgency,
    summary: input.summary,
  });

  dispatchAlert({
    companyId: input.companyId,
    alertType: "negative_sentiment",
    sourceId: input.conversationId,
    messageText: message,
  }).catch(() => {});
}

export function triggerFailedPostAlert(input: {
  companyId: string;
  scheduledPostId: string;
  caption: string | null;
  platforms: string[];
  errorSummary: string;
}): void {
  const message = buildFailedPostMessage({
    scheduledPostId: input.scheduledPostId,
    caption: input.caption,
    platforms: input.platforms,
    errorSummary: input.errorSummary,
  });

  dispatchAlert({
    companyId: input.companyId,
    alertType: "failed_post",
    sourceId: input.scheduledPostId,
    messageText: message,
  }).catch(() => {});
}

export function triggerViralContentAlert(input: {
  companyId: string;
  platform: string;
  engagementScore: number;
  content: string;
  postUrl: string | null;
  sourceId: string;
}): void {
  const message = buildViralContentMessage({
    platform: input.platform,
    engagementScore: input.engagementScore,
    content: input.content,
    postUrl: input.postUrl,
  });

  dispatchAlert({
    companyId: input.companyId,
    alertType: "viral_content",
    sourceId: input.sourceId,
    messageText: message,
  }).catch(() => {});
}
