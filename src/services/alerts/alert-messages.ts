/**
 * Arquivo: src/services/alerts/alert-messages.ts
 * Proposito: Montar mensagens de alerta WhatsApp para cada tipo de evento.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import "server-only";

import { createWhatsappAlertAccessToken } from "@/lib/alerts/access-token";

function resolveAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

export function buildPurchaseIntentMessage(input: {
  companyId: string;
  conversationId: string;
  contactName: string | null;
  contactPhone: string | null;
  summary: string;
}): string {
  const appUrl = resolveAppUrl();
  const alertToken = createWhatsappAlertAccessToken({
    companyId: input.companyId,
    conversationId: input.conversationId,
  });
  const contactLabel = input.contactName ?? input.contactPhone ?? "Contato desconhecido";

  const summary = input.summary.length > 300
    ? input.summary.slice(0, 300).trimEnd() + "..."
    : input.summary;

  return [
    "\u{1F4B0} *Inten\u00E7\u00E3o de Compra Detectada*",
    "",
    `Contato: ${contactLabel}`,
    `Resumo: ${summary}`,
    "",
    `\u{1F517} Acesse agora: ${appUrl}/alertas/whatsapp/${alertToken}`,
  ].join("\n");
}

export function buildNegativeSentimentMessage(input: {
  companyId: string;
  conversationId: string;
  contactName: string | null;
  contactPhone: string | null;
  urgency: number;
  summary: string;
}): string {
  const appUrl = resolveAppUrl();
  const alertToken = createWhatsappAlertAccessToken({
    companyId: input.companyId,
    conversationId: input.conversationId,
  });
  const contactLabel = input.contactName ?? input.contactPhone ?? "Contato desconhecido";
  const urgencyBars = "\u{2B1B}".repeat(input.urgency) + "\u{2B1C}".repeat(5 - input.urgency);

  const summary = input.summary.length > 300
    ? input.summary.slice(0, 300).trimEnd() + "..."
    : input.summary;

  return [
    "\u{1F534} *Sentimento Negativo \u2014 Alta Urg\u00EAncia*",
    "",
    `Contato: ${contactLabel}`,
    `Urg\u00EAncia: ${urgencyBars} (${input.urgency}/5)`,
    `Resumo: ${summary}`,
    "",
    `\u{1F517} Acesse agora: ${appUrl}/alertas/whatsapp/${alertToken}`,
  ].join("\n");
}

export function buildFailedPostMessage(input: {
  scheduledPostId: string;
  caption: string | null;
  platforms: string[];
  errorSummary: string;
}): string {
  const appUrl = resolveAppUrl();

  const errorSummary = input.errorSummary.length > 200
    ? input.errorSummary.slice(0, 200).trimEnd() + "..."
    : input.errorSummary;

  return [
    "\u{274C} *Falha na Publica\u00E7\u00E3o de Post*",
    "",
    `Post: ${(input.caption ?? "Sem legenda").slice(0, 100)}`,
    `Plataformas: ${input.platforms.join(", ")}`,
    `Erro: ${errorSummary}`,
    "",
    `\u{1F517} Revise o agendamento: ${appUrl}/social-publisher/historico`,
  ].join("\n");
}

export function buildViralContentMessage(input: {
  platform: string;
  engagementScore: number;
  content: string;
  postUrl: string | null;
}): string {
  const appUrl = resolveAppUrl();
  const content = input.content.length > 200
    ? input.content.slice(0, 200).trimEnd() + "..."
    : input.content;

  const lines = [
    "\u{1F525} *Conte\u00FAdo Viral Detectado*",
    "",
    `Plataforma: ${input.platform}`,
    `Score de engajamento: ${input.engagementScore}`,
    `Conte\u00FAdo: ${content}`,
  ];

  if (input.postUrl) {
    lines.push(`\u{1F517} Link: ${input.postUrl}`);
  }

  lines.push("", `\u{1F517} Veja no radar: ${appUrl}/intelligence`);
  return lines.join("\n");
}
