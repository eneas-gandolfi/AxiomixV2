/**
 * Arquivo: src/components/whatsapp/pulso-comercial.tsx
 * Proposito: Camada 1 do dashboard de Inteligencia Comercial — strip de 4 KPIs
 *            "acima da dobra". Responde "tem dinheiro escapando agora?" em 4
 *            cartoes:
 *
 *              [1] Leads esfriando agora — count atual + delta vs ontem
 *              [2] Leads novos sem 1a resposta — count + idade do mais antigo
 *              [3] Tempo medio 1a resposta (hoje) — TFR + delta vs ontem
 *              [4] Taxa de 1a resposta no SLA (7d) — % + sample size
 *
 *            Faz 2 queries Supabase em paralelo:
 *              - conversations status=open janela 60d (para cold leads)
 *              - messages com sent_at >= now - 8d (cobre todos os calculos)
 *
 *            Renderiza um Server Component sem estado client-side.
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  detectColdLeads,
  type ConversationRow,
  type LastMessageRow,
} from "@/lib/whatsapp/cold-leads";
import {
  computeTfrStats,
  computeWaitingLeads,
  DEFAULT_SLA_SECONDS,
  formatTfrDuration,
  type ConversationLight,
  type MessageLight,
} from "@/lib/whatsapp/pulso-comercial";

const DAY_MS = 86_400_000;
const CONVERSATION_LOOKBACK_DAYS = 60;
const MESSAGE_LOOKBACK_DAYS = 8;
const MESSAGE_SCAN_LIMIT = 8000;

function formatWaitOldest(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h${String(rem).padStart(2, "0")}` : `${hours}h`;
}

type DeltaTone = "positive" | "negative" | "neutral";

function deltaPresentation(
  value: number,
  invert: boolean,
): { label: string; tone: DeltaTone; Icon: typeof TrendingUp } {
  if (value === 0) return { label: "estável", tone: "neutral", Icon: Minus };
  const isUp = value > 0;
  const goodWhenUp = !invert;
  const tone: DeltaTone = (isUp && goodWhenUp) || (!isUp && !goodWhenUp) ? "positive" : "negative";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const sign = isUp ? "+" : "";
  return { label: `${sign}${value}`, tone, Icon };
}

export async function PulsoComercial({ companyId }: { companyId: string }) {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - DAY_MS);
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const conversationsSince = new Date(now.getTime() - CONVERSATION_LOOKBACK_DAYS * DAY_MS).toISOString();
  const messagesSince = new Date(now.getTime() - MESSAGE_LOOKBACK_DAYS * DAY_MS).toISOString();

  const [{ data: convRows }, { data: msgRows }] = await Promise.all([
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
  ]);

  const conversations: ConversationRow[] = (convRows ?? []).map((c) => ({
    id: c.id,
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    assignedTo: c.assigned_to,
    lastMessageAt: c.last_message_at,
  }));

  const lightConversations: ConversationLight[] = conversations.map((c) => ({
    id: c.id,
    contactName: c.contactName,
    assignedTo: c.assignedTo,
    lastMessageAt: c.lastMessageAt,
  }));

  const allMessages: MessageLight[] = (msgRows ?? [])
    .filter((m): m is { conversation_id: string; direction: string | null; sent_at: string } =>
      Boolean(m.conversation_id) && Boolean(m.sent_at),
    )
    .map((m) => ({
      conversationId: m.conversation_id,
      direction: m.direction,
      sentAt: m.sent_at,
    }));

  // KPI 1 — Cold leads (atual e ontem) — derivar lastMessage por conversa para detectColdLeads.
  const lastByConvAll = new Map<string, LastMessageRow>();
  for (const m of allMessages) {
    if (!lastByConvAll.has(m.conversationId)) {
      lastByConvAll.set(m.conversationId, {
        conversationId: m.conversationId,
        direction: m.direction,
        sentAt: m.sentAt,
      });
    }
  }

  const coldNow = detectColdLeads({ conversations, lastMessages: lastByConvAll, now });
  const coldYesterday = detectColdLeads({
    conversations,
    lastMessages: lastByConvAll,
    now: oneDayAgo,
  });
  const coldDelta = coldNow.length - coldYesterday.length;
  const coldDeltaUi = deltaPresentation(coldDelta, true); // mais frios = ruim

  // KPI 2 — Leads aguardando 1a resposta (janela default 24h)
  const waiting = computeWaitingLeads(lightConversations, allMessages, now);

  // KPI 3 — TFR medio hoje vs ontem (janelas de 24h)
  const tfrHoje = computeTfrStats(allMessages, oneDayAgo, now);
  const tfrOntem = computeTfrStats(allMessages, new Date(oneDayAgo.getTime() - DAY_MS), oneDayAgo);
  const tfrDeltaMin =
    tfrHoje.avgSeconds !== null && tfrOntem.avgSeconds !== null
      ? Math.round((tfrHoje.avgSeconds - tfrOntem.avgSeconds) / 60)
      : null;
  const tfrDeltaUi =
    tfrDeltaMin === null ? null : deltaPresentation(tfrDeltaMin, true); // mais minutos = ruim

  // KPI 4 — % no SLA (7d)
  const tfrSemana = computeTfrStats(allMessages, sevenDaysAgo, now);

  return (
    <section
      aria-labelledby="pulso-comercial-titulo"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
    >
      <header className="mb-3 flex items-start gap-2.5 border-b border-[var(--color-border)] pb-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(212,98,30,0.12)] font-bricolage text-xs font-bold text-[var(--color-accent,#D4621E)]">
          ⚡
        </div>
        <div className="flex-1">
          <h2
            id="pulso-comercial-titulo"
            className="font-bricolage text-[15px] font-bold leading-tight tracking-tight text-[var(--color-text)]"
          >
            Pulso Comercial
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--color-text-secondary)]">
            Tem dinheiro escapando agora — quanto, onde e quem deixou escapar.
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Últimas 24h
        </span>
      </header>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          accent="danger"
          eyebrow="Leads esfriando agora"
          value={coldNow.length}
          valueSuffix={coldNow.length === 1 ? "lead" : "leads"}
          delta={coldDeltaUi}
          subline="corte: 3+ dias parado"
        />
        <KpiCard
          accent="warning"
          eyebrow="Sem 1ª resposta"
          value={waiting.count}
          valueSuffix={waiting.count === 1 ? "lead" : "leads"}
          subline={
            waiting.count > 0
              ? `o mais antigo: ${formatWaitOldest(waiting.oldestWaitSeconds)}`
              : "ninguém aguardando agora"
          }
        />
        <KpiCard
          accent="info"
          eyebrow="Tempo médio 1ª resposta"
          value={tfrHoje.avgSeconds === null ? "—" : formatTfrDuration(tfrHoje.avgSeconds)}
          delta={tfrDeltaUi}
          subline={
            tfrHoje.sampleSize > 0
              ? `hoje · ${tfrHoje.sampleSize} conv.`
              : "sem amostra suficiente"
          }
        />
        <KpiCard
          accent="success"
          eyebrow="Taxa no SLA (7d)"
          value={
            tfrSemana.withinSlaPct === null
              ? "—"
              : `${Math.round(tfrSemana.withinSlaPct)}%`
          }
          subline={
            tfrSemana.sampleSize > 0
              ? `SLA ≤ ${Math.round(DEFAULT_SLA_SECONDS / 60)}min · base ${tfrSemana.sampleSize}`
              : `SLA ≤ ${Math.round(DEFAULT_SLA_SECONDS / 60)} min · sem amostra`
          }
        />
      </div>
    </section>
  );
}

type Accent = "danger" | "warning" | "info" | "success";

const ACCENT_CLASS: Record<Accent, string> = {
  danger: "border-l-[3px] border-l-[var(--color-danger)]",
  warning: "border-l-[3px] border-l-[var(--color-warning)]",
  info: "border-l-[3px] border-l-[var(--color-info,#4A5A6A)]",
  success: "border-l-[3px] border-l-[var(--color-success)]",
};

const DELTA_CLASS: Record<DeltaTone, string> = {
  positive: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  negative: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  neutral: "text-[var(--color-text-tertiary)] bg-[var(--color-surface-2)]",
};

function KpiCard({
  accent,
  eyebrow,
  value,
  valueSuffix,
  subline,
  delta,
  deltaSuffix,
  footHint,
}: {
  accent: Accent;
  eyebrow: string;
  value: number | string;
  valueSuffix?: string;
  subline?: string;
  delta?: { label: string; tone: DeltaTone; Icon: typeof TrendingUp } | null;
  deltaSuffix?: string;
  footHint?: string;
}) {
  return (
    <article
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm transition-transform hover:-translate-y-px hover:shadow-md ${ACCENT_CLASS[accent]}`}
    >
      <div className="flex items-center gap-1.5">
        <p className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {eyebrow}
        </p>
        {delta ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-mono text-[10px] font-semibold ${DELTA_CLASS[delta.tone]}`}
          >
            <delta.Icon className="h-2.5 w-2.5" />
            {delta.label}
          </span>
        ) : null}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="font-bricolage text-[28px] font-bold leading-none tracking-tight text-[var(--color-text)]">
          {value}
        </span>
        {valueSuffix ? (
          <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
            {valueSuffix}
          </span>
        ) : null}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
        {subline ? (
          <span className="text-[var(--color-text)]">{subline}</span>
        ) : deltaSuffix && delta ? (
          <span>{deltaSuffix}</span>
        ) : footHint ? (
          <span>{footHint}</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </p>
    </article>
  );
}

export function PulsoComercialSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-start gap-2.5 border-b border-[var(--color-border)] pb-3">
        <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
        <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-2)]" />
      </header>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-[var(--color-surface-2)]"
          />
        ))}
      </div>
    </section>
  );
}
