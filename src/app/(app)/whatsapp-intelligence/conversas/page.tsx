/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/page.tsx
 * Propósito: Lista de conversas sincronizadas com filtros, seleção e análise em lote.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MessageSquare, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BulkAnalyzeButton } from "@/components/whatsapp/bulk-analyze-button";
import { ConversationsList } from "@/components/whatsapp/conversations-list";
import { StartConversationButton } from "@/components/whatsapp/start-conversation-button";
import { ContactsManagerSheet } from "@/components/whatsapp/contacts-manager-sheet";
import { ConversationDetailView } from "@/components/whatsapp/conversation-detail-view";
import { ConversationDrawerShell } from "@/components/whatsapp/conversation-drawer-shell";
import { ConversationDrawerSkeleton } from "@/components/whatsapp/conversation-drawer-skeleton";
import { getEvoCrmClient } from "@/services/evo-crm/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Real-time inbox feel — 10s cache + revalidatePath on Evo CRM sync and
// every conversation mutation (analyze, assign, resolve, delete, etc.).
export const revalidate = 10;

export default async function ConversasPage({ searchParams }: ConversasPageProps) {
  const params = await searchParams;
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  // Buscar conversas, agentes e inboxes do Evo CRM em paralelo
  const fetchAgents = async (): Promise<Array<{ id: string; name: string | null }>> => {
    try {
      const evoClient = await getEvoCrmClient(companyId);
      const users = await evoClient.listUsers();
      return users.map((u) => ({ id: u.id, name: u.name ?? null }));
    } catch (error) {
      console.error("[conversas page] fetchAgents failed; degrading to empty list", {
        companyId,
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause?.code : undefined,
      });
      return [];
    }
  };

  const fetchInboxes = async (): Promise<
    Array<{ id: string; name: string | null; channel_type: string | null }>
  > => {
    try {
      const evoClient = await getEvoCrmClient(companyId);
      const items = await evoClient.listInboxes();
      return items.map((i) => ({
        id: i.id,
        name: i.name ?? null,
        channel_type: i.channel_type ?? null,
      }));
    } catch (error) {
      console.error("[conversas page] fetchInboxes failed; degrading to empty list", {
        companyId,
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause?.code : undefined,
      });
      return [];
    }
  };

  const [{ data: conversations }, agents, inboxes] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, external_id, contact_name, contact_avatar_url, remote_jid, status, inbox_id, last_message_at, assigned_to"
      )
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100),
    fetchAgents(),
    fetchInboxes(),
  ]);

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

  // Buscar insights (depende dos conversationIds)
  const { data: insights } =
    conversationIds.length > 0
      ? await supabase
          .from("conversation_insights")
          .select("conversation_id, sentiment, intent")
          .eq("company_id", companyId)
          .in("conversation_id", conversationIds)
      : { data: [] as Array<{ conversation_id: string; sentiment: Sentiment | null; intent: string | null }> };

  const insightMap = new Map<string, { sentiment: Sentiment | null; intent: string | null }>();
  for (const insight of insights ?? []) {
    if (insight.conversation_id) {
      insightMap.set(insight.conversation_id, {
        sentiment: insight.sentiment as Sentiment | null,
        intent: insight.intent,
      });
    }
  }

  // Contar conversas sem análise
  const unanalyzedCount = (conversations ?? []).filter((c) => !insightMap.has(c.id)).length;

  // Filtros iniciais vindos da URL (ex: ?sentiment=negativo&period=1)
  const validSentiments = ["positivo", "neutro", "negativo", "not_analyzed"] as const;
  const validPeriods = ["1", "7", "30", "all"] as const;

  const initialFilters: Record<string, string> = {};
  const sentimentParam = typeof params.sentiment === "string" ? params.sentiment : undefined;
  const periodParam = typeof params.period === "string" ? params.period : undefined;

  if (sentimentParam && (validSentiments as readonly string[]).includes(sentimentParam)) {
    initialFilters.sentiment = sentimentParam;
  }
  if (periodParam && (validPeriods as readonly string[]).includes(periodParam)) {
    initialFilters.period = periodParam;
  }

  // Preparar dados das conversas com insights
  const conversationsWithInsights = (conversations ?? []).map((conv) => {
    const insight = insightMap.get(conv.id);
    return {
      ...conv,
      assigned_to: conv.assigned_to ?? null,
      inbox_id: conv.inbox_id ?? null,
      sentiment: insight?.sentiment ?? null,
      intent: insight?.intent ?? null,
    };
  });

  const drawerIdRaw = typeof params.c === "string" ? params.c : null;
  const drawerId = drawerIdRaw && UUID_RE.test(drawerIdRaw) ? drawerIdRaw : null;

  return (
    <>
      {/* Header da seção · contador KPI à esquerda + ações à direita.
          Sync é via webhook real-time do Evo CRM — sem botão "Sincronizar". */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {/* Esquerda: KPI compacto · número grande + status sutil abaixo */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
              {(conversations ?? []).length}
            </span>
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              {(conversations ?? []).length === 1 ? "conversa" : "conversas"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-text-tertiary)]">
            <span
              className="flex items-center gap-1.5"
              title="Mensagens novas aparecem aqui automaticamente via webhook do Evo CRM."
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse"
                aria-hidden
              />
              Tempo real
            </span>
            {unanalyzedCount > 0 && (conversations ?? []).length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[var(--color-warning)]" />
                  <span className="tabular-nums font-medium text-[var(--color-warning)]">
                    {unanalyzedCount}
                  </span>
                  {" sem análise"}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Direita: ações */}
        <div className="flex flex-wrap gap-2">
          <ContactsManagerSheet
            companyId={companyId}
            defaultOpen={params.contatos === "1"}
          />
          <BulkAnalyzeButton companyId={companyId} />
          <StartConversationButton companyId={companyId} />
        </div>
      </div>

      {(conversations ?? []).length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma conversa sincronizada"
          description="Clique em 'Sincronizar com Evo CRM' para trazer as conversas e iniciar a análise com IA."
        />
      ) : (
        <ConversationsList
          conversations={conversationsWithInsights}
          companyId={companyId}
          agents={agents}
          inboxes={inboxes}
          initialFilters={Object.keys(initialFilters).length > 0 ? initialFilters : undefined}
        />
      )}

      {drawerId ? (
        <ConversationDrawerShell conversationId={drawerId}>
          <Suspense fallback={<ConversationDrawerSkeleton />}>
            <ConversationDetailView id={drawerId} mode="drawer" />
          </Suspense>
        </ConversationDrawerShell>
      ) : null}
    </>
  );
}
