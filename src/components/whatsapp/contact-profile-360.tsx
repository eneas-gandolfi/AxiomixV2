/**
 * Arquivo: src/components/whatsapp/contact-profile-360.tsx
 * Propósito: Visao 360 graus de um contato com metricas de engajamento e timeline de sentimento.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Tag,
  Loader2,
  Smile,
  Meh,
  Frown,
  Sparkles,
} from "lucide-react";

type SentimentPoint = {
  date: string;
  sentiment: string;
  conversationId: string;
};

type ContactMetrics = {
  totalConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  sentimentDistribution: { positivo: number; neutro: number; negativo: number };
  sentimentTimeline: SentimentPoint[];
  topIntents: Array<{ intent: string; count: number }>;
  lastInteraction: string | null;
  firstInteraction: string | null;
  avgMessagesPerConversation: number;
  currentLabels: Array<{ name: string; color: string | null }>;
};

type ContactProfile360Props = {
  companyId: string;
  contactPhone: string;
  contactName?: string;
};

const INTENT_LABELS: Record<string, string> = {
  compra: "Compra",
  suporte: "Suporte",
  reclamacao: "Reclamação",
  duvida: "Dúvida",
  cancelamento: "Cancelamento",
  outro: "Outro",
};

const INTENT_COLORS: Record<string, string> = {
  compra: "#52C41A",
  suporte: "#1677FF",
  reclamacao: "#FF4D4F",
  duvida: "#FA8C16",
  cancelamento: "#FF4D4F",
  outro: "#8A8A8A",
};

const SENTIMENT_CONFIG = {
  positivo: { icon: Smile, color: "#52C41A", bg: "bg-green-50", label: "Positivo" },
  neutro: { icon: Meh, color: "#FA8C16", bg: "bg-amber-50", label: "Neutro" },
  negativo: { icon: Frown, color: "#FF4D4F", bg: "bg-red-50", label: "Negativo" },
};

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: typeof MessageSquare;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

export function ContactProfile360({ companyId, contactPhone, contactName }: ContactProfile360Props) {
  const [metrics, setMetrics] = useState<ContactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!contactPhone) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/whatsapp/contact-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, contactPhone }),
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, contactPhone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  if (!metrics || metrics.totalConversations === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Nenhum dado de engajamento encontrado para este contato.
        </p>
      </div>
    );
  }

  const totalSentiment =
    metrics.sentimentDistribution.positivo +
    metrics.sentimentDistribution.neutro +
    metrics.sentimentDistribution.negativo;

  const sentimentPcts = totalSentiment > 0
    ? {
        positivo: Math.round((metrics.sentimentDistribution.positivo / totalSentiment) * 100),
        neutro: Math.round((metrics.sentimentDistribution.neutro / totalSentiment) * 100),
        negativo: Math.round((metrics.sentimentDistribution.negativo / totalSentiment) * 100),
      }
    : { positivo: 0, neutro: 0, negativo: 0 };

  return (
    <div className="space-y-5">
      {/* Métricas principais */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Conversas"
          value={metrics.totalConversations}
          icon={MessageSquare}
          color="#2EC4B6"
        />
        <MetricCard
          label="Mensagens"
          value={metrics.totalMessages}
          icon={TrendingUp}
          color="#2EC4B6"
        />
        <MetricCard
          label="Recebidas"
          value={metrics.inboundMessages}
          icon={ArrowDownLeft}
          color="#1677FF"
        />
        <MetricCard
          label="Enviadas"
          value={metrics.outboundMessages}
          icon={ArrowUpRight}
          color="#52C41A"
        />
      </div>

      {/* Distribuição de Sentimento */}
      {totalSentiment > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
            Sentimento
          </h4>
          <div className="space-y-2">
            {(["positivo", "neutro", "negativo"] as const).map((s) => {
              const config = SENTIMENT_CONFIG[s];
              const Icon = config.icon;
              const pct = sentimentPcts[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: config.color }} />
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: config.color }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-[var(--color-text)]">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline de Sentimento */}
      {metrics.sentimentTimeline.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
            Histórico de Sentimento
          </h4>
          <div className="flex gap-1">
            {metrics.sentimentTimeline.slice(-20).map((point, i) => {
              const s = point.sentiment as keyof typeof SENTIMENT_CONFIG;
              const config = SENTIMENT_CONFIG[s] ?? SENTIMENT_CONFIG.neutro;
              return (
                <div
                  key={i}
                  className="h-6 flex-1 rounded-sm transition-colors"
                  style={{ backgroundColor: config.color }}
                  title={`${config.label} — ${new Date(point.date).toLocaleDateString("pt-BR")}`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Mais antigo</span>
            <span>Mais recente</span>
          </div>
        </div>
      )}

      {/* Top Intenções */}
      {metrics.topIntents.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
            Intenções Detectadas
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {metrics.topIntents.map((item) => (
              <span
                key={item.intent}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${INTENT_COLORS[item.intent] ?? "#8A8A8A"}18`,
                  color: INTENT_COLORS[item.intent] ?? "#8A8A8A",
                }}
              >
                {INTENT_LABELS[item.intent] ?? item.intent}
                <span className="opacity-60">({item.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Datas */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.firstInteraction && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <Calendar className="h-3 w-3" />
              Primeiro contato
            </div>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              {new Date(metrics.firstInteraction).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        )}
        {metrics.lastInteraction && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <Calendar className="h-3 w-3" />
              Última interação
            </div>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
              {new Date(metrics.lastInteraction).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Labels atuais */}
      {metrics.currentLabels.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-[var(--color-text-secondary)]">
            Labels Atuais
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {metrics.currentLabels.map((label, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                style={{
                  borderColor: label.color ?? "#d9d9d9",
                  color: label.color ?? "#666",
                }}
              >
                <Tag className="h-2.5 w-2.5" />
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumo AI */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">
            Resumo do Relacionamento
          </h4>
          {!aiSummary && (
            <button
              type="button"
              onClick={async () => {
                setSummaryLoading(true);
                try {
                  const res = await fetch("/api/whatsapp/contact-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyId, contactPhone, contactName }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setAiSummary(data.summary ?? "Não foi possível gerar o resumo.");
                  }
                } catch {
                  setAiSummary("Erro ao gerar resumo.");
                } finally {
                  setSummaryLoading(false);
                }
              }}
              disabled={summaryLoading}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2EC4B6] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#27b0a3] transition-colors disabled:opacity-40"
            >
              {summaryLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {summaryLoading ? "Gerando..." : "Gerar com IA"}
            </button>
          )}
        </div>

        {aiSummary && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[#2EC4B6] mt-0.5" />
              <p className="text-sm text-[var(--color-text)] leading-relaxed">{aiSummary}</p>
            </div>
          </div>
        )}

        {!aiSummary && !summaryLoading && (
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Clique em &quot;Gerar com IA&quot; para um resumo do relacionamento.
          </p>
        )}
      </div>
    </div>
  );
}
