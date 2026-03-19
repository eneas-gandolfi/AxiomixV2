/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/conversas/analise-lote/page.tsx
 * Propósito: Página de análise em lote — visão consolidada de múltiplas conversas.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layouts/page-container";
import { buttonVariants } from "@/components/ui/button";
import { BatchAnalysisView } from "@/components/whatsapp/batch-analysis-view";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Sentiment = "positivo" | "neutro" | "negativo";

type InsightRow = {
  conversation_id: string;
  sentiment: Sentiment | null;
  intent: string | null;
  summary: string | null;
  action_items: unknown;
};

type AnaliseLotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseActionItems(raw: unknown): { items: string[]; urgency: number | null; keyTopics: string[] } {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      items: Array.isArray(obj.items)
        ? obj.items.filter((i): i is string => typeof i === "string")
        : [],
      urgency:
        typeof obj.urgency === "number" && obj.urgency >= 1 && obj.urgency <= 5
          ? obj.urgency
          : null,
      keyTopics: Array.isArray(obj.key_topics)
        ? obj.key_topics.filter((t): t is string => typeof t === "string")
        : [],
    };
  }

  if (Array.isArray(raw)) {
    return {
      items: raw.filter((item): item is string => typeof item === "string"),
      urgency: null,
      keyTopics: [],
    };
  }

  return { items: [], urgency: null, keyTopics: [] };
}

export default async function AnaliseLotePage({ searchParams }: AnaliseLotePageProps) {
  const params = await searchParams;
  const idsParam = typeof params.ids === "string" ? params.ids : "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (ids.length === 0) {
    redirect("/whatsapp-intelligence/conversas");
  }

  const companyId = await getUserCompanyId();
  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();

  // Buscar conversas
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, contact_name, remote_jid, last_message_at")
    .eq("company_id", companyId)
    .in("id", ids);

  // Buscar insights
  const { data: insights } = await supabase
    .from("conversation_insights")
    .select("conversation_id, sentiment, intent, summary, action_items")
    .eq("company_id", companyId)
    .in("conversation_id", ids);

  const insightMap = new Map<string, InsightRow>();
  for (const row of insights ?? []) {
    if (row.conversation_id) {
      insightMap.set(row.conversation_id, {
        conversation_id: row.conversation_id,
        sentiment: row.sentiment,
        intent: row.intent,
        summary: row.summary,
        action_items: row.action_items,
      });
    }
  }

  // Construir dados dos cards
  const conversationCards = (conversations ?? []).map((conv) => {
    const insight = insightMap.get(conv.id);
    const parsed = parseActionItems(insight?.action_items);
    return {
      id: conv.id,
      contactName: conv.contact_name,
      remoteJid: conv.remote_jid,
      lastMessageAt: conv.last_message_at,
      sentiment: insight?.sentiment ?? null,
      intent: insight?.intent ?? null,
      urgency: parsed.urgency,
      summary: insight?.summary ?? null,
      keyTopics: parsed.keyTopics,
      actionItemsCount: parsed.items.length,
    };
  });

  // Calcular métricas agregadas
  const total = conversationCards.length;
  const analyzed = conversationCards.filter((c) => c.sentiment !== null).length;
  const pending = total - analyzed;

  // Distribuição de sentimento
  const sentimentCounts = { positivo: 0, neutro: 0, negativo: 0 };
  for (const card of conversationCards) {
    if (card.sentiment && card.sentiment in sentimentCounts) {
      sentimentCounts[card.sentiment]++;
    }
  }
  const sentimentDistribution = [
    { name: "Positivo", value: sentimentCounts.positivo, color: "var(--color-success)" },
    { name: "Neutro", value: sentimentCounts.neutro, color: "var(--color-warning)" },
    { name: "Negativo", value: sentimentCounts.negativo, color: "var(--color-danger)" },
  ];

  // Sentimento dominante
  const dominantSentiment =
    sentimentCounts.positivo >= sentimentCounts.neutro &&
    sentimentCounts.positivo >= sentimentCounts.negativo
      ? "positivo"
      : sentimentCounts.negativo >= sentimentCounts.neutro
        ? "negativo"
        : "neutro";

  // Distribuição de intenção
  const intentCounts: Record<string, number> = {};
  for (const card of conversationCards) {
    if (card.intent) {
      const key = card.intent;
      intentCounts[key] = (intentCounts[key] ?? 0) + 1;
    }
  }
  const intentDistribution = Object.entries(intentCounts).map(([name, value]) => ({
    name,
    value,
    color: "",
  }));

  // Urgência média
  const urgencies = conversationCards
    .map((c) => c.urgency)
    .filter((u): u is number => u !== null);
  const averageUrgency =
    urgencies.length > 0
      ? urgencies.reduce((sum, u) => sum + u, 0) / urgencies.length
      : null;

  const metrics = {
    total,
    analyzed,
    pending,
    averageUrgency,
    dominantSentiment: analyzed > 0 ? dominantSentiment : "",
    sentimentDistribution,
    intentDistribution,
  };

  return (
    <PageContainer
      title="Análise em Lote"
      description={`${total} conversa${total !== 1 ? "s" : ""} selecionada${total !== 1 ? "s" : ""}`}
      actions={
        <Link
          href="/whatsapp-intelligence/conversas"
          className={buttonVariants({ variant: "ghost" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      }
    >
      <BatchAnalysisView metrics={metrics} conversations={conversationCards} />
    </PageContainer>
  );
}
