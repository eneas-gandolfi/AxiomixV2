/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/page.tsx
 * Propósito: Lista de conversas sincronizadas com filtros, seleção e análise em lote.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { MessageSquare, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncConversationsButton } from "@/components/whatsapp/sync-conversations-button";
import { BulkAnalyzeButton } from "@/components/whatsapp/bulk-analyze-button";
import { ConversationsList } from "@/components/whatsapp/conversations-list";
import { StartConversationButton } from "@/components/whatsapp/start-conversation-button";
import { AutoSyncIndicator } from "@/components/whatsapp/auto-sync-indicator";
import { getEvoCrmClient } from "@/services/evo-crm/client";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConversasPage({ searchParams }: ConversasPageProps) {
  noStore();

  const params = await searchParams;
  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  // Buscar conversas e agentes Evo CRM em paralelo
  const fetchAgents = async (): Promise<Array<{ id: string; name: string | null }>> => {
    try {
      const evoClient = await getEvoCrmClient(companyId);
      const users = await evoClient.listUsers();
      return users.map((u) => ({ id: u.id, name: u.name ?? null }));
    } catch {
      return [];
    }
  };

  const [{ data: conversations }, agents] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, external_id, contact_name, contact_avatar_url, remote_jid, status, last_message_at, assigned_to")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100),
    fetchAgents(),
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
        sentiment: insight.sentiment,
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
      sentiment: insight?.sentiment ?? null,
      intent: insight?.intent ?? null,
    };
  });

  return (
    <>
      {/* Ações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <AutoSyncIndicator companyId={companyId} intervalSeconds={180} />
        <div className="flex flex-wrap gap-2">
          <StartConversationButton companyId={companyId} />
          <BulkAnalyzeButton companyId={companyId} />
          <SyncConversationsButton companyId={companyId} />
        </div>
      </div>

      {/* Nudge de conversas sem análise */}
      {unanalyzedCount > 0 && (conversations ?? []).length > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-[var(--color-warning)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text)]">{unanalyzedCount}</span>
            {" "}conversa{unanalyzedCount !== 1 ? "s" : ""} sem análise de IA — use o filtro{" "}
            <span className="font-medium">&quot;Sem análise&quot;</span> para encontrá-las ou{" "}
            <span className="font-medium">&quot;Analisar em lote&quot;</span> para processar automaticamente.
          </p>
        </div>
      )}

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
          initialFilters={Object.keys(initialFilters).length > 0 ? initialFilters : undefined}
        />
      )}
    </>
  );
}
