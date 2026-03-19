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

  return [
    "\u{1F4B0} *Intencao de Compra Detectada*",
    "",
    `Contato: ${contactLabel}`,
    `Resumo: ${input.summary.slice(0, 200)}`,
    "",
    "Acesse agora:",
    `${appUrl}/alertas/whatsapp/${alertToken}`,
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

  return [
    "\u{1F534} *Sentimento Negativo + Alta Urgencia*",
    "",
    `Contato: ${contactLabel}`,
    `Urgencia: ${urgencyBars} (${input.urgency}/5)`,
    `Resumo: ${input.summary.slice(0, 200)}`,
    "",
    "Acesse agora:",
    `${appUrl}/alertas/whatsapp/${alertToken}`,
  ].join("\n");
}

export function buildFailedPostMessage(input: {
  scheduledPostId: string;
  caption: string | null;
  platforms: string[];
  errorSummary: string;
}): string {
  const appUrl = resolveAppUrl();

  return [
    "\u{274C} *Falha na Publicacao de Post*",
    "",
    `Post: ${(input.caption ?? "Sem legenda").slice(0, 100)}`,
    `Plataformas: ${input.platforms.join(", ")}`,
    `Erro: ${input.errorSummary.slice(0, 200)}`,
    "",
    "Revise o agendamento:",
    `${appUrl}/social-publisher/historico`,
  ].join("\n");
}

export function buildViralContentMessage(input: {
  platform: string;
  engagementScore: number;
  content: string;
  postUrl: string | null;
}): string {
  const appUrl = resolveAppUrl();
  const lines = [
    "\u{1F525} *Conteudo Viral Detectado*",
    "",
    `Plataforma: ${input.platform}`,
    `Score de engajamento: ${input.engagementScore}`,
    `Conteudo: ${input.content.slice(0, 200)}`,
  ];

  if (input.postUrl) {
    lines.push(`Link: ${input.postUrl}`);
  }

  lines.push("", "Veja no radar:", `${appUrl}/intelligence`);
  return lines.join("\n");
}
