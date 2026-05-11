/**
 * Arquivo: src/lib/whatsapp/pulso-comercial.ts
 * Proposito: Funcoes puras para calcular o Pulso Comercial — Camada 1 do
 *            dashboard de Inteligencia Comercial. Tres helpers:
 *
 *              (1) computeWaitingLeads(conversations, messages, now, slaSec)
 *                  Conversas com ultima msg inbound recente e sem outbound
 *                  depois — "leads novos sem 1a resposta".
 *
 *              (2) computeTfrStats(messages, windowStart, windowEnd, slaSec)
 *                  TFR (tempo ate 1a resposta) por conversa dentro de uma
 *                  janela. Retorna media e taxa dentro do SLA.
 *
 *              (3) DEFAULT_SLA_SECONDS — 30 min, threshold padrao da equipe.
 *
 *            Limites conhecidos da v0:
 *            - "Recente" = last_message_at >= now - 24h (configuravel).
 *            - TFR ignora janela fora-de-horario-comercial.
 *            - direction normalizada igual cold-leads (inbound/in/received).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

export const DEFAULT_SLA_SECONDS = 30 * 60;
const RECENT_INBOUND_WINDOW_MS = 24 * 60 * 60 * 1000;

const INBOUND_VALUES = new Set(["inbound", "in", "received"]);
const OUTBOUND_VALUES = new Set(["outbound", "out", "sent"]);

export type DirectionKind = "inbound" | "outbound" | "other";

export function classifyMessageDirection(
  direction: string | null,
): DirectionKind {
  if (!direction) return "other";
  const normalized = direction.toLowerCase();
  if (INBOUND_VALUES.has(normalized)) return "inbound";
  if (OUTBOUND_VALUES.has(normalized)) return "outbound";
  return "other";
}

export type ConversationLight = {
  id: string;
  contactName: string | null;
  assignedTo: string | null;
  lastMessageAt: string | null;
};

export type MessageLight = {
  conversationId: string;
  direction: string | null;
  sentAt: string;
};

export type WaitingLead = {
  conversationId: string;
  contactName: string;
  assignedTo: string | null;
  firstInboundAt: string;
  waitSeconds: number;
};

export type WaitingLeadsResult = {
  count: number;
  oldestWaitSeconds: number;
  leads: WaitingLead[];
};

export function computeWaitingLeads(
  conversations: ConversationLight[],
  messages: MessageLight[],
  now: Date,
  recentWindowMs: number = RECENT_INBOUND_WINDOW_MS,
): WaitingLeadsResult {
  const nowMs = now.getTime();
  const messagesByConv = new Map<string, MessageLight[]>();
  for (const m of messages) {
    if (!m.conversationId || !m.sentAt) continue;
    const list = messagesByConv.get(m.conversationId);
    if (list) list.push(m);
    else messagesByConv.set(m.conversationId, [m]);
  }

  const leads: WaitingLead[] = [];

  for (const conv of conversations) {
    if (!conv.lastMessageAt) continue;
    const list = (messagesByConv.get(conv.id) ?? [])
      .slice()
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    if (list.length === 0) continue;

    let firstInboundMs: number | null = null;
    let outboundAfterInbound = false;

    for (const msg of list) {
      const kind = classifyMessageDirection(msg.direction);
      const ts = new Date(msg.sentAt).getTime();
      if (Number.isNaN(ts)) continue;
      if (kind === "inbound") {
        if (firstInboundMs === null) firstInboundMs = ts;
      } else if (kind === "outbound" && firstInboundMs !== null && ts >= firstInboundMs) {
        outboundAfterInbound = true;
        break;
      }
    }

    if (firstInboundMs === null) continue;
    if (outboundAfterInbound) continue;
    if (firstInboundMs < nowMs - recentWindowMs) continue;

    const waitSeconds = Math.max(0, Math.floor((nowMs - firstInboundMs) / 1000));
    leads.push({
      conversationId: conv.id,
      contactName: conv.contactName?.trim() || "Lead sem nome",
      assignedTo: conv.assignedTo,
      firstInboundAt: new Date(firstInboundMs).toISOString(),
      waitSeconds,
    });
  }

  leads.sort((a, b) => b.waitSeconds - a.waitSeconds);
  const oldestWaitSeconds = leads[0]?.waitSeconds ?? 0;

  return { count: leads.length, oldestWaitSeconds, leads };
}

export type TfrStats = {
  sampleSize: number;
  avgSeconds: number | null;
  medianSeconds: number | null;
  withinSlaPct: number | null;
};

export function computeTfrStats(
  messages: MessageLight[],
  windowStart: Date,
  windowEnd: Date,
  slaSeconds: number = DEFAULT_SLA_SECONDS,
): TfrStats {
  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();

  type Pair = { firstInbound: number | null; firstResponse: number | null };
  const pairs = new Map<string, Pair>();

  const sorted = messages
    .filter((m) => m.conversationId && m.sentAt)
    .map((m) => ({
      conversationId: m.conversationId,
      direction: m.direction,
      ts: new Date(m.sentAt).getTime(),
    }))
    .filter((m) => !Number.isNaN(m.ts))
    .sort((a, b) => a.ts - b.ts);

  for (const m of sorted) {
    const kind = classifyMessageDirection(m.direction);
    let pair = pairs.get(m.conversationId);
    if (!pair) {
      pair = { firstInbound: null, firstResponse: null };
      pairs.set(m.conversationId, pair);
    }
    if (kind === "inbound") {
      if (pair.firstInbound === null) pair.firstInbound = m.ts;
    } else if (kind === "outbound") {
      if (
        pair.firstInbound !== null &&
        pair.firstResponse === null &&
        m.ts >= pair.firstInbound
      ) {
        pair.firstResponse = m.ts;
      }
    }
  }

  const tfrs: number[] = [];
  for (const pair of pairs.values()) {
    if (pair.firstInbound === null || pair.firstResponse === null) continue;
    if (pair.firstInbound < startMs || pair.firstInbound > endMs) continue;
    const seconds = (pair.firstResponse - pair.firstInbound) / 1000;
    if (seconds >= 0) tfrs.push(seconds);
  }

  if (tfrs.length === 0) {
    return { sampleSize: 0, avgSeconds: null, medianSeconds: null, withinSlaPct: null };
  }

  const sum = tfrs.reduce((acc, n) => acc + n, 0);
  const avg = sum / tfrs.length;
  const sortedTfrs = tfrs.slice().sort((a, b) => a - b);
  const mid = Math.floor(sortedTfrs.length / 2);
  const median =
    sortedTfrs.length % 2 === 0
      ? (sortedTfrs[mid - 1] + sortedTfrs[mid]) / 2
      : sortedTfrs[mid];
  const withinSla = tfrs.filter((t) => t <= slaSeconds).length;

  return {
    sampleSize: tfrs.length,
    avgSeconds: avg,
    medianSeconds: median,
    withinSlaPct: (withinSla / tfrs.length) * 100,
  };
}

export function formatTfrDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h${String(rem).padStart(2, "0")}` : `${hours}h`;
}
