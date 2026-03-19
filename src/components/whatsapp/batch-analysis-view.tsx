/**
 * Arquivo: src/components/whatsapp/batch-analysis-view.tsx
 * Propósito: Orquestra a UI da página de análise em lote (métricas, gráficos, cards).
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { MetricCardWithSparkline } from "./metric-card-with-sparkline";
import { BatchSentimentBarChart } from "./batch-sentiment-bar-chart";
import { IntentDistributionChart } from "./intent-distribution-chart";
import { BatchConversationCard } from "./batch-conversation-card";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversationCardData = {
  id: string;
  contactName: string | null;
  remoteJid: string;
  lastMessageAt: string | null;
  sentiment: Sentiment | null;
  intent: string | null;
  urgency: number | null;
  summary: string | null;
  keyTopics: string[];
  actionItemsCount: number;
};

type AggregatedMetrics = {
  total: number;
  analyzed: number;
  pending: number;
  averageUrgency: number | null;
  dominantSentiment: string;
  sentimentDistribution: { name: string; value: number; color: string }[];
  intentDistribution: { name: string; value: number; color: string }[];
};

type BatchAnalysisViewProps = {
  metrics: AggregatedMetrics;
  conversations: ConversationCardData[];
};

export function BatchAnalysisView({ metrics, conversations }: BatchAnalysisViewProps) {
  return (
    <div className="space-y-6">
      {/* Seção 1 — Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCardWithSparkline
          title="Conversas selecionadas"
          value={metrics.total}
          subtitle="Total no lote"
          icon="message"
          color="primary"
        />
        <MetricCardWithSparkline
          title="Analisadas"
          value={metrics.analyzed}
          subtitle={metrics.pending > 0 ? `${metrics.pending} pendente(s)` : "Todas analisadas"}
          icon="sparkles"
          color="success"
        />
        <MetricCardWithSparkline
          title="Urgência média"
          value={metrics.averageUrgency !== null ? Math.round(metrics.averageUrgency * 10) / 10 : 0}
          subtitle={metrics.averageUrgency !== null ? "de 5" : "Sem dados"}
          icon="alert"
          color={
            metrics.averageUrgency !== null && metrics.averageUrgency >= 4
              ? "danger"
              : metrics.averageUrgency !== null && metrics.averageUrgency >= 3
                ? "warning"
                : "success"
          }
        />
        <MetricCardWithSparkline
          title="Sentimento dominante"
          value={metrics.analyzed}
          subtitle={metrics.dominantSentiment || "Sem dados"}
          icon="target"
          color={
            metrics.dominantSentiment === "positivo"
              ? "success"
              : metrics.dominantSentiment === "negativo"
                ? "danger"
                : "warning"
          }
        />
      </div>

      {/* Seção 2 — Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BatchSentimentBarChart data={metrics.sentimentDistribution} />
        <IntentDistributionChart data={metrics.intentDistribution} />
      </div>

      {/* Seção 3 — Cards de conversas */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-text">
          Conversas ({conversations.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conv) => (
            <BatchConversationCard key={conv.id} {...conv} />
          ))}
        </div>
      </div>
    </div>
  );
}
