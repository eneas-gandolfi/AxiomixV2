/**
 * Arquivo: src/components/whatsapp/cold-leads-card.tsx
 * Proposito: §0 da aba Analise — "Leads esfriando agora, com causa provavel".
 *            Server Component que busca conversas abertas, identifica leads
 *            esfriados via detectColdLeads, resolve nome do vendedor e
 *            renderiza top 10 com badge de motivo + CTA "Abrir conversa".
 *
 *            Fonte: Supabase (tabelas ja sincronizadas via Evo CRM job), nao
 *            fetch direto a API Evo CRM. Filtro: status='open' AND
 *            last_message_at no intervalo [now-60d, now-3d].
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import Link from "next/link";
import { AlertCircle, ChevronRight, Flame } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  detectColdLeads,
  type ColdLead,
  type ColdLeadMotivo,
  type ConversationRow,
  type LastMessageRow,
} from "@/lib/whatsapp/cold-leads";
import { SectionWrapper } from "@/components/whatsapp/analise-vendor-performance";

const DAY_MS = 86_400_000;
const WINDOW_MAX_DAYS = 60;
const WINDOW_MIN_DAYS = 3;
const TOP_LIMIT = 10;
const MESSAGE_SCAN_LIMIT = 4000;

const MOTIVO_LABEL: Record<ColdLeadMotivo, string> = {
  vendedor_nao_respondeu: "vendedor não respondeu",
  lead_silenciou: "silenciou após sua mensagem",
  sem_followup: "sem follow-up agendado",
};

const MOTIVO_STYLE: Record<ColdLeadMotivo, string> = {
  vendedor_nao_respondeu:
    "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  lead_silenciou: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  sem_followup: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
};

function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "??";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

function diasLabel(dias: number): string {
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

export async function ColdLeadsCard({ companyId }: { companyId: string }) {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const oldest = new Date(now.getTime() - WINDOW_MAX_DAYS * DAY_MS).toISOString();
  const youngest = new Date(now.getTime() - WINDOW_MIN_DAYS * DAY_MS).toISOString();

  const { data: convRows } = await supabase
    .from("conversations")
    .select("id, contact_name, contact_phone, assigned_to, last_message_at")
    .eq("company_id", companyId)
    .eq("status", "open")
    .gte("last_message_at", oldest)
    .lte("last_message_at", youngest)
    .order("last_message_at", { ascending: true })
    .limit(200);

  const conversations: ConversationRow[] = (convRows ?? []).map((c) => ({
    id: c.id,
    contactName: c.contact_name,
    contactPhone: c.contact_phone,
    assignedTo: c.assigned_to,
    lastMessageAt: c.last_message_at,
  }));

  const lastMessages = new Map<string, LastMessageRow>();
  const conversationIds = conversations.map((c) => c.id);

  if (conversationIds.length > 0) {
    const { data: msgRows } = await supabase
      .from("messages")
      .select("conversation_id, direction, sent_at")
      .eq("company_id", companyId)
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: false })
      .limit(MESSAGE_SCAN_LIMIT);

    for (const m of msgRows ?? []) {
      if (!m.conversation_id || !m.sent_at) continue;
      if (lastMessages.has(m.conversation_id)) continue;
      lastMessages.set(m.conversation_id, {
        conversationId: m.conversation_id,
        direction: m.direction,
        sentAt: m.sent_at,
      });
    }
  }

  const allCold = detectColdLeads({ conversations, lastMessages, now });
  const top = allCold.slice(0, TOP_LIMIT);

  if (top.length === 0) {
    return (
      <SectionWrapper
        number={0}
        question="Tem dinheiro escapando agora?"
        subtitle="Lista as conversas abertas sem resposta há mais de 3 dias, com o motivo provável do esfriamento."
      >
        <p className="py-5 text-center text-[12.5px] italic text-[var(--color-text-tertiary)]">
          Nenhum lead esfriado nas últimas semanas — parabéns. Volte amanhã.
        </p>
      </SectionWrapper>
    );
  }

  const assigneeIds = Array.from(
    new Set(
      top
        .map((c) => c.assignedTo)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const vendorNameById = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", assigneeIds);
    for (const u of users ?? []) {
      vendorNameById.set(u.id, u.full_name ?? u.email ?? "Sem nome");
    }
  }

  const totalEsfriados = allCold.length;

  return (
    <SectionWrapper
      number={0}
      question="Tem dinheiro escapando agora?"
      subtitle={`Top ${top.length} de ${totalEsfriados} leads abertos sem evolução. Comece pelo topo — é onde a fila mais dói.`}
    >
      <ul className="divide-y divide-[var(--color-border)]">
        {top.map((lead) => (
          <ColdLeadRow
            key={lead.conversationId}
            lead={lead}
            vendorName={
              lead.assignedTo
                ? vendorNameById.get(lead.assignedTo) ?? "Sem nome"
                : "Não atribuído"
            }
          />
        ))}
      </ul>
    </SectionWrapper>
  );
}

function ColdLeadRow({
  lead,
  vendorName,
}: {
  lead: ColdLead;
  vendorName: string;
}) {
  const motivoLabel = MOTIVO_LABEL[lead.motivo];
  const motivoClass = MOTIVO_STYLE[lead.motivo];
  const isCritical = lead.motivo === "vendedor_nao_respondeu" && lead.diasSemResposta >= 5;

  return (
    <li className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[10.5px] font-semibold text-[var(--color-text)]">
        {formatInitials(lead.contactName)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--color-text)]">
          {lead.contactName}
          {isCritical ? (
            <Flame
              className="ml-1 inline h-3 w-3 -translate-y-px text-[var(--color-danger)]"
              aria-label="Crítico"
            />
          ) : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
          <span>
            vendedor: <span className="font-medium text-[var(--color-text)]">{vendorName}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${motivoClass}`}
          >
            {motivoLabel}
          </span>
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-[15px] font-bold leading-none text-[var(--color-danger)]">
          {lead.diasSemResposta}d
        </p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {diasLabel(lead.diasSemResposta)} parado
        </p>
      </div>

      <Link
        href={`/whatsapp-intelligence/conversas?conversation=${lead.conversationId}`}
        className="inline-flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-text)]/30"
      >
        Abrir conversa
        <ChevronRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

export function ColdLeadsCardSkeleton() {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-start gap-2.5 border-b border-[var(--color-border)] pb-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
          <AlertCircle className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        </div>
        <div className="h-4 w-60 animate-pulse rounded bg-[var(--color-surface-2)]" />
      </header>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-md bg-[var(--color-surface-2)]"
          />
        ))}
      </div>
    </section>
  );
}
