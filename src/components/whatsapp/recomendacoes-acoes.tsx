/**
 * Arquivo: src/components/whatsapp/recomendacoes-acoes.tsx
 * Proposito: Camada de acao do dashboard — gera cards de "Proximas Acoes
 *            Sugeridas" a partir do estado agregado (cold leads, heatmap gap,
 *            objecoes, TFR). Server Component que orquestra as queries e
 *            consome generateRecomendacoes para a logica.
 *
 *            Aceita ate 4 recomendacoes simultaneas, urgentes primeiro.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { AlertTriangle, Lightbulb } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  detectColdLeads,
  type ConversationRow,
  type LastMessageRow,
} from "@/lib/whatsapp/cold-leads";
import {
  aggregateObjections,
  parseObjectionsField,
} from "@/lib/whatsapp/objecoes";
import { computeResponseHeatmap } from "@/lib/whatsapp/heatmap-resposta";
import {
  generateRecomendacoes,
  type Recomendacao,
} from "@/lib/whatsapp/recomendacoes";
import {
  computeTfrStats,
  DEFAULT_SLA_SECONDS,
  type MessageLight,
} from "@/lib/whatsapp/pulso-comercial";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const CONVERSATION_LOOKBACK_DAYS = 60;
const MESSAGE_LOOKBACK_DAYS = 30;
const INSIGHTS_LOOKBACK_DAYS = 30;
const MESSAGE_SCAN_LIMIT = 8000;

export async function RecomendacoesAcoesCard({
  companyId,
}: {
  companyId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const conversationsSince = new Date(
    now.getTime() - CONVERSATION_LOOKBACK_DAYS * DAY_MS,
  ).toISOString();
  const messagesSince = new Date(now.getTime() - MESSAGE_LOOKBACK_DAYS * DAY_MS).toISOString();
  const insightsSince = new Date(now.getTime() - INSIGHTS_LOOKBACK_DAYS * DAY_MS).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [
    { data: convRows },
    { data: msgRows },
    { data: insightRows },
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, contact_name, contact_phone, assigned_to, last_message_at")
      .eq("company_id", companyId)
      .eq("status", "open")
      .gte("last_message_at", conversationsSince)
      .limit(500),
    supabase
      .from("messages")
      .select("conversation_id, direction, sent_at")
      .eq("company_id", companyId)
      .gte("sent_at", messagesSince)
      .order("sent_at", { ascending: false })
      .limit(MESSAGE_SCAN_LIMIT),
    supabase
      .from("conversation_insights")
      .select("conversation_id, objections")
      .eq("company_id", companyId)
      .gte("generated_at", insightsSince),
  ]);

  const conversations: ConversationRow[] = (convRows ?? []).map((c) => ({
    id: c.id,
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    assignedTo: c.assigned_to,
    lastMessageAt: c.last_message_at,
  }));

  const lastByConv = new Map<string, LastMessageRow>();
  const messages: MessageLight[] = [];
  for (const m of msgRows ?? []) {
    if (!m.conversation_id || !m.sent_at) continue;
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, {
        conversationId: m.conversation_id,
        direction: m.direction,
        sentAt: m.sent_at,
      });
    }
    messages.push({
      conversationId: m.conversation_id,
      direction: m.direction,
      sentAt: m.sent_at,
    });
  }

  const coldLeads = detectColdLeads({ conversations, lastMessages: lastByConv, now });

  const vendorIds = Array.from(
    new Set(coldLeads.map((c) => c.assignedTo).filter((v): v is string => Boolean(v))),
  );
  const vendorNameById = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", vendorIds);
    for (const u of users ?? []) {
      vendorNameById.set(u.id, u.full_name ?? u.email ?? "Sem nome");
    }
  }

  const heatmap = computeResponseHeatmap(messages, DEFAULT_SLA_SECONDS);

  const objectionsPerInsight: string[][] = (insightRows ?? []).map((r) =>
    parseObjectionsField(r.objections),
  );
  const objections = aggregateObjections({ objectionsPerInsight });
  const totalInsights = insightRows?.length ?? 0;

  const tfrSemana = computeTfrStats(messages, sevenDaysAgo, now);

  const recomendacoes = generateRecomendacoes({
    coldLeads,
    vendorNameById,
    worstGap: heatmap.worstGap,
    objections,
    totalInsights,
    tfrAvgSec: tfrSemana.avgSeconds,
    slaSec: DEFAULT_SLA_SECONDS,
  });

  if (recomendacoes.length === 0) {
    return (
      <SectionWrapper
        icon={Lightbulb}
        question="Próximas ações sugeridas"
        subtitle="Tudo sob controle agora — nenhum alerta heurístico foi disparado."
      >
        <p className="py-5 text-center text-[12.5px] italic text-[var(--color-text-tertiary)]">
          Nenhuma recomendação no momento. Volte depois — heurísticas rodam a cada refresh.
        </p>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper
      icon={Lightbulb}
      question="Próximas ações sugeridas"
      subtitle="Heurísticas v0 — combinam leads frios, gargalo de horário, objeções recorrentes e TFR acima do SLA."
    >
      <ul className="grid gap-2 md:grid-cols-2">
        {recomendacoes.map((reco) => (
          <RecomendacaoCard key={reco.id} reco={reco} />
        ))}
      </ul>
    </SectionWrapper>
  );
}

function RecomendacaoCard({ reco }: { reco: Recomendacao }) {
  const isUrgent = reco.nivel === "urgente";
  return (
    <li
      className={`flex gap-2.5 rounded-lg border bg-[var(--color-surface)] p-2.5 ${
        isUrgent
          ? "border-l-[3px] border-l-[var(--color-danger)] border-[var(--color-border)]"
          : "border-l-[3px] border-l-[var(--color-warning)] border-[var(--color-border)]"
      }`}
    >
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded ${
          isUrgent
            ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
            : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
        }`}
      >
        {isUrgent ? <AlertTriangle className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold leading-tight text-[var(--color-text)]">{reco.titulo}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
          {reco.descricao}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isUrgent ? "bg-[var(--color-danger)]" : "bg-[var(--color-warning)]"
            }`}
          />
          <span
            className={
              isUrgent
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-warning)]"
            }
          >
            {reco.nivel}
          </span>
          <span className="text-[var(--color-text-tertiary)]">· {reco.categoria}</span>
        </p>
      </div>
    </li>
  );
}

export function RecomendacoesAcoesCardSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="mb-3 h-4 w-60 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="grid gap-2 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
        ))}
      </div>
    </section>
  );
}
