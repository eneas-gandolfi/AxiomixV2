/**
 * Arquivo: src/components/whatsapp/batch-conversation-card.tsx
 * Propósito: Card individual de conversa na visão de análise em lote.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  sentimentBadgeClass,
  getIntentIcon,
  getIntentColor,
  formatContactDisplay,
  formatDate,
} from "./conversations-table";

type Sentiment = "positivo" | "neutro" | "negativo";

type BatchConversationCardProps = {
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

export function BatchConversationCard({
  id,
  contactName,
  remoteJid,
  lastMessageAt,
  sentiment,
  intent,
  urgency,
  summary,
  keyTopics,
  actionItemsCount,
}: BatchConversationCardProps) {
  const router = useRouter();
  const hasAnalysis = sentiment !== null;

  const IntentIcon = getIntentIcon(intent);
  const intentColor = getIntentColor(intent);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/whatsapp-intelligence/conversas/${id}`)}
    >
      <CardContent className="p-4">
        {/* Header: nome + badges */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">
              {formatContactDisplay(contactName, remoteJid)}
            </p>
            <p className="mt-0.5 text-xs text-muted">{formatDate(lastMessageAt)}</p>
          </div>
          {hasAnalysis && (
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${sentimentBadgeClass(sentiment)}`}
            >
              {sentiment}
            </span>
          )}
        </div>

        {hasAnalysis ? (
          <>
            {/* Intenção e Urgência */}
            <div className="mb-3 flex items-center gap-3">
              {intent && (
                <span className={`flex items-center gap-1 text-xs font-medium ${intentColor}`}>
                  <IntentIcon className="h-3.5 w-3.5" />
                  {intent}
                </span>
              )}
              {urgency !== null && (
                <span className="text-xs text-muted">
                  Urgência: <span className="font-medium text-text">{urgency}/5</span>
                </span>
              )}
            </div>

            {/* Resumo */}
            {summary && (
              <p className="mb-3 line-clamp-2 text-xs text-muted">{summary}</p>
            )}

            {/* Tópicos-chave */}
            {keyTopics.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {keyTopics.slice(0, 4).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* Ações */}
            {actionItemsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted">
                <CheckCircle2 className="h-3 w-3" />
                {actionItemsCount} {actionItemsCount === 1 ? "ação sugerida" : "ações sugeridas"}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-light">Sem análise — clique para ver detalhes</p>
        )}
      </CardContent>
    </Card>
  );
}
