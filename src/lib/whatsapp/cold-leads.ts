/**
 * Arquivo: src/lib/whatsapp/cold-leads.ts
 * Proposito: Pure function que detecta leads esfriados a partir das conversations
 *            do Supabase + ultima mensagem por conversa. Classifica o motivo do
 *            esfriamento ('vendedor_nao_respondeu' | 'lead_silenciou' |
 *            'sem_followup') para guiar a acao imediata do gestor.
 *
 *            Limites conhecidos da v0:
 *            - Calculo de dias em America/Sao_Paulo (dia calendario), sem
 *              excluir fora-de-horario-comercial.
 *            - Sem pipeline_stage (schema atual nao expoe estagio) — heuristica
 *              roda so sobre "quem falou por ultimo" + "ha quantos dias".
 *            - assignedTo retornado bruto (uuid); resolucao para nome do
 *              vendedor fica a cargo do consumidor.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { diffCalendarDaysInTz } from "./calendar-days";

export type ConversationRow = {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  assignedTo: string | null;
  lastMessageAt: string | null;
};

export type LastMessageRow = {
  conversationId: string;
  direction: string | null;
  sentAt: string;
};

export type ColdLeadMotivo =
  | "vendedor_nao_respondeu"
  | "lead_silenciou"
  | "sem_followup";

export type LastSender = "lead" | "vendedor" | "desconhecido";

export type ColdLead = {
  conversationId: string;
  contactName: string;
  contactPhone: string | null;
  assignedTo: string | null;
  lastMessageAt: string;
  lastSender: LastSender;
  diasSemResposta: number;
  motivo: ColdLeadMotivo;
};

export type DetectColdLeadsInput = {
  conversations: ConversationRow[];
  lastMessages: Map<string, LastMessageRow>;
  now: Date;
};

const INBOUND_VALUES = new Set(["inbound", "in", "received"]);
const OUTBOUND_VALUES = new Set(["outbound", "out", "sent"]);

const DIAS_VENDEDOR_NAO_RESPONDEU = 3;
const DIAS_LEAD_SILENCIOU = 7;
const DIAS_SEM_FOLLOWUP = 14;

function classifyDirection(direction: string | null): LastSender {
  if (!direction) return "desconhecido";
  const normalized = direction.toLowerCase();
  if (INBOUND_VALUES.has(normalized)) return "lead";
  if (OUTBOUND_VALUES.has(normalized)) return "vendedor";
  return "desconhecido";
}

function inferMotivo(
  lastSender: LastSender,
  dias: number,
): ColdLeadMotivo | null {
  if (lastSender === "lead" && dias >= DIAS_VENDEDOR_NAO_RESPONDEU) {
    return "vendedor_nao_respondeu";
  }
  if (lastSender === "vendedor" && dias >= DIAS_LEAD_SILENCIOU) {
    return "lead_silenciou";
  }
  if (dias >= DIAS_SEM_FOLLOWUP) {
    return "sem_followup";
  }
  return null;
}

export function detectColdLeads(input: DetectColdLeadsInput): ColdLead[] {
  const { conversations, lastMessages, now } = input;
  const result: ColdLead[] = [];

  for (const conv of conversations) {
    const refTimestamp = conv.lastMessageAt;
    if (!refTimestamp) continue;

    const lastAt = new Date(refTimestamp);
    if (Number.isNaN(lastAt.getTime())) continue;

    const dias = diffCalendarDaysInTz(lastAt, now);
    const last = lastMessages.get(conv.id);
    const lastSender: LastSender = last
      ? classifyDirection(last.direction)
      : "desconhecido";

    const motivo = inferMotivo(lastSender, dias);
    if (!motivo) continue;

    result.push({
      conversationId: conv.id,
      contactName: conv.contactName?.trim() || "Lead sem nome",
      contactPhone: conv.contactPhone,
      assignedTo: conv.assignedTo,
      lastMessageAt: refTimestamp,
      lastSender,
      diasSemResposta: dias,
      motivo,
    });
  }

  result.sort((a, b) => b.diasSemResposta - a.diasSemResposta);
  return result;
}

export const COLD_LEADS_THRESHOLDS = {
  vendedorNaoRespondeuDias: DIAS_VENDEDOR_NAO_RESPONDEU,
  leadSilenciouDias: DIAS_LEAD_SILENCIOU,
  semFollowupDias: DIAS_SEM_FOLLOWUP,
} as const;
