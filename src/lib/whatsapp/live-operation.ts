/**
 * Arquivo: src/lib/whatsapp/live-operation.ts
 * Propósito: Server-side data fetcher pra aba "Operação" — calcula quem é o
 *            cliente mais esquecido, fila de conversas em risco e workload
 *            por operador. Usa thresholds do nicho do tenant.
 *
 *            Limites conhecidos:
 *            - Conversas multi-atendente onde outro vendedor pegou o celular
 *              ainda não são distinguidas.
 *            - "Última mensagem" vem das colunas denormalizadas de
 *              `conversations` (last_message_*), mantidas pelos escritores de
 *              `messages` — sem varredura da tabela de mensagens.
 *            - Cap de segurança de 1000 conversas abertas, ordenado por
 *              last_message_at ASC (mais antigas primeiro): diferente do cap
 *              da v1 (que escondia conversas antigas), este preserva o
 *              "mais esquecido" e a fila de risco; acima do cap, apenas o
 *              workload por operador pode subcontar (logado quando ocorre).
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database/types/database.types";
import { getNicheBySlug, type NicheSlug } from "@/lib/niches";
import {
  computeBusinessSecondsElapsed,
  isBusinessHours,
  isCurrentlyWithinBusinessHours,
} from "@/lib/whatsapp/business-hours";

export type ConversationSeverity = "ok" | "amber" | "red";

export type WaitingConversation = {
  conversationId: string;
  customerName: string;
  customerPhone: string | null;
  customerAvatar: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  lastMessage: string | null;
  /** Tipo da última mensagem ("text", "audio", "image", "document", "video", ...) */
  lastMessageType: string | null;
  lastInboundAt: string;
  waitSeconds: number;
  severity: ConversationSeverity;
  /** Estágio no pipeline (Kanban) — ex: "Negociação", "Pós-venda" */
  pipelineStage: string | null;
  /** Labels/tags da conversa */
  labels: string[];
};

export type OperatorWorkload = {
  operatorId: string | null;
  operatorName: string | null;
  activeCount: number;
  worstWaitSeconds: number | null;
  worstCustomerName: string | null;
  severity: ConversationSeverity;
};

export type LiveOperationData = {
  /** Cliente com maior tempo de espera (ou null se ninguém esperando) */
  mostForgotten: WaitingConversation | null;
  /** Outras conversas em risco (>= âmbar), excluindo a já no hero, top 5 */
  inRiskQueue: WaitingConversation[];
  /** Workload por operador */
  operators: OperatorWorkload[];
  /** Thresholds em uso (vindos do nicho) */
  thresholds: {
    amberSeconds: number;
    redSeconds: number;
    nicheSlug: NicheSlug | null;
  };
  /** Total de conversas em espera (pra "X conversas em risco" no badge) */
  totalWaiting: number;
  /** Conversas com severidade âmbar ou vermelha — fonte do "Conversas paradas"
   *  no dashboard global. Espelho 1:1 do que a Operação destaca. */
  stalledCount: number;
  /** True se estamos atualmente dentro do horário comercial. Quando false,
   *  cronômetros locais devem pausar (a UI mostra "Loja fechada"). */
  isCurrentlyOpen: boolean;
  /** True se a empresa tem business_hours cadastrado. Quando false, cronômetro
   *  conta corrido (sem exclusão de janela). */
  hasBusinessHours: boolean;
};

function classifySeverity(
  waitSeconds: number,
  amberSeconds: number,
  redSeconds: number,
): ConversationSeverity {
  if (waitSeconds >= redSeconds) return "red";
  if (waitSeconds >= amberSeconds) return "amber";
  return "ok";
}

/**
 * Busca dados ao vivo da Operação. Lê:
 *   1) niche_slug do tenant (pra calcular thresholds)
 *   2) conversas abertas com assignees + última mensagem denormalizada
 *   3) nomes dos operadores (memberships + users)
 */
const OPEN_CONVERSATIONS_CAP = 1000;

export async function getLiveOperationData(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<LiveOperationData> {
  // 1+2 em paralelo: thresholds do nicho e conversas abertas são queries
  // independentes — antes eram sequenciais (2 round-trips virou 1).
  const [{ data: company }, { data: conversations }] = await Promise.all([
    supabase
      .from("companies")
      .select("niche_slug, business_hours, timezone")
      .eq("id", companyId)
      .maybeSingle(),
    // Conversas abertas (status not in resolved/closed) com a última mensagem
    // denormalizada (last_message_*) — dispensa varrer `messages`.
    // ASC + cap: as mais antigas (as que importam pra fila) vêm primeiro.
    supabase
      .from("conversations")
      .select(
        "id, contact_name, contact_phone, contact_avatar_url, assigned_to, status, pipeline_stage, labels, last_message_at, last_message_preview, last_message_direction, last_message_type",
      )
      .eq("company_id", companyId)
      .or("status.is.null,status.not.in.(resolved,closed)")
      .order("last_message_at", { ascending: true, nullsFirst: false })
      .limit(OPEN_CONVERSATIONS_CAP),
  ]);

  if (conversations && conversations.length === OPEN_CONVERSATIONS_CAP) {
    console.warn(
      `[live-operation] cap de ${OPEN_CONVERSATIONS_CAP} conversas abertas atingido para company ${companyId}; workload por operador pode subcontar.`,
    );
  }

  const nicheSlug = (company?.niche_slug ?? null) as NicheSlug | null;
  const niche = nicheSlug ? getNicheBySlug(nicheSlug) : null;
  const amberSeconds = niche?.thresholdAmberSeconds ?? 1800; // default 30min
  const redSeconds = niche?.thresholdRedSeconds ?? 7200; // default 2h

  // Business hours pra exclusão de janela (Mary's red line)
  const businessHours = isBusinessHours(company?.business_hours)
    ? company.business_hours
    : null;
  const timezone = company?.timezone ?? "America/Sao_Paulo";
  const now = new Date();
  const isCurrentlyOpen = businessHours
    ? isCurrentlyWithinBusinessHours(now, businessHours, timezone)
    : true; // sem horário cadastrado = sempre aberto (não pausa)

  if (!conversations || conversations.length === 0) {
    return {
      mostForgotten: null,
      inRiskQueue: [],
      operators: [],
      thresholds: { amberSeconds, redSeconds, nicheSlug },
      totalWaiting: 0,
      stalledCount: 0,
      isCurrentlyOpen,
      hasBusinessHours: businessHours !== null,
    };
  }

  // 3) Nomes dos operadores (assignees presentes)
  const assigneeIds = Array.from(
    new Set(
      conversations
        .map((c) => c.assigned_to)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const operatorNameById = new Map<string, string | null>();
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", assigneeIds);
    for (const u of users ?? []) {
      operatorNameById.set(u.id, u.full_name ?? u.email ?? null);
    }
  }

  // 4) Compute wait times pra conversas onde a última mensagem é do cliente.
  //    Quando business_hours está cadastrado, conta APENAS segundos dentro
  //    da janela (Mary's red line — atendentes não cobrados por hora-fechada).
  const waiting: WaitingConversation[] = [];

  for (const conv of conversations) {
    // Direção pode vir como "inbound" (webhook normaliza) ou "in" (legacy/sync).
    // Aceita os 2 formatos pra não perder cliente esperando por convenção
    // de string.
    const isInbound =
      conv.last_message_direction === "inbound" || conv.last_message_direction === "in";
    if (!isInbound) continue;
    if (!conv.last_message_at) continue;

    const lastInboundDate = new Date(conv.last_message_at);
    const waitSeconds = businessHours
      ? computeBusinessSecondsElapsed(lastInboundDate, now, businessHours, timezone)
      : Math.floor((now.getTime() - lastInboundDate.getTime()) / 1000);

    if (waitSeconds < 0) continue;

    waiting.push({
      conversationId: conv.id,
      customerName: conv.contact_name ?? "Sem nome",
      customerPhone: conv.contact_phone,
      customerAvatar: conv.contact_avatar_url,
      assigneeId: conv.assigned_to,
      assigneeName: conv.assigned_to ? operatorNameById.get(conv.assigned_to) ?? null : null,
      lastMessage: conv.last_message_preview,
      lastMessageType: conv.last_message_type,
      lastInboundAt: conv.last_message_at,
      waitSeconds,
      severity: classifySeverity(waitSeconds, amberSeconds, redSeconds),
      pipelineStage: conv.pipeline_stage,
      labels: Array.isArray(conv.labels) ? conv.labels : [],
    });
  }

  waiting.sort((a, b) => b.waitSeconds - a.waitSeconds);

  // 5) Hero = mais esquecido. Fila = top 5 dos restantes em âmbar+.
  const mostForgotten = waiting[0] ?? null;
  const inRiskQueue = waiting
    .slice(1)
    .filter((w) => w.severity !== "ok")
    .slice(0, 5);

  // 6) Operators workload — agrega de TODAS as conversas abertas (não só
  // as em espera), pra mostrar "atendentes ativos" mesmo quando ninguém
  // está esperando.
  type Acc = {
    operatorId: string | null;
    operatorName: string | null;
    activeCount: number;
    worstWaitSeconds: number | null;
    worstCustomerName: string | null;
  };

  const operatorMap = new Map<string, Acc>();

  for (const conv of conversations) {
    const key = conv.assigned_to ?? "__unassigned__";
    if (!operatorMap.has(key)) {
      operatorMap.set(key, {
        operatorId: conv.assigned_to,
        operatorName: conv.assigned_to
          ? operatorNameById.get(conv.assigned_to) ?? null
          : null,
        activeCount: 0,
        worstWaitSeconds: null,
        worstCustomerName: null,
      });
    }
    const acc = operatorMap.get(key)!;
    acc.activeCount++;
  }

  // Sobre a pior conversa: olha apenas as em espera, atualiza por operador
  for (const w of waiting) {
    const key = w.assigneeId ?? "__unassigned__";
    const acc = operatorMap.get(key);
    if (!acc) continue;
    if (acc.worstWaitSeconds === null || w.waitSeconds > acc.worstWaitSeconds) {
      acc.worstWaitSeconds = w.waitSeconds;
      acc.worstCustomerName = w.customerName;
    }
  }

  const operators: OperatorWorkload[] = Array.from(operatorMap.values())
    .map((acc) => ({
      operatorId: acc.operatorId,
      operatorName: acc.operatorName,
      activeCount: acc.activeCount,
      worstWaitSeconds: acc.worstWaitSeconds,
      worstCustomerName: acc.worstCustomerName,
      severity:
        acc.worstWaitSeconds === null
          ? ("ok" as ConversationSeverity)
          : classifySeverity(acc.worstWaitSeconds, amberSeconds, redSeconds),
    }))
    // Ordena por urgência (vermelhos primeiro, depois âmbar, depois ok)
    .sort((a, b) => {
      const order: Record<ConversationSeverity, number> = { red: 0, amber: 1, ok: 2 };
      if (order[a.severity] !== order[b.severity]) {
        return order[a.severity] - order[b.severity];
      }
      return (b.worstWaitSeconds ?? 0) - (a.worstWaitSeconds ?? 0);
    });

  const stalledCount = waiting.filter((w) => w.severity !== "ok").length;

  return {
    mostForgotten,
    inRiskQueue,
    operators,
    thresholds: { amberSeconds, redSeconds, nicheSlug },
    totalWaiting: waiting.length,
    stalledCount,
    isCurrentlyOpen,
    hasBusinessHours: businessHours !== null,
  };
}
