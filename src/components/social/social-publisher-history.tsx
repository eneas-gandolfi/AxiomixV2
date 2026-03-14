"use client";

import { useCallback, useState } from "react";
import { AlertCircle, History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostDetailsModal } from "./post-details-modal";
import { PostHistoryTable } from "./post-history-table";
import type {
  PublishErrorMap,
  PublishProgressMap,
  PublishResultMap,
  SocialPlatform,
  SocialPostType,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type ScheduledHistoryItem = {
  id: string;
  postType: SocialPostType;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: SocialPublishStatus;
  progress: PublishProgressMap;
  externalPostIds: PublishResultMap;
  errorDetails: PublishErrorMap;
  publishedAt: string | null;
  createdAt: string;
  qstashMessageId: string | null;
  mediaFileIds: string[];
  thumbnailUrl: string | null;
  thumbnailType: string | null;
};

type HistoryResponse = {
  items: ScheduledHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ApiErrorPayload = {
  error?: string;
};

type SocialPublisherHistoryProps = {
  companyId: string;
  initialHistory: HistoryResponse;
};

export function SocialPublisherHistory({
  companyId,
  initialHistory,
}: SocialPublisherHistoryProps) {
  const [history, setHistory] = useState<ScheduledHistoryItem[]>(initialHistory.items);
  const [page, setPage] = useState(initialHistory.page);
  const [total, setTotal] = useState(initialHistory.total);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);
  const [details, setDetails] = useState<ScheduledHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (nextPage: number) => {
    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        companyId,
        page: String(nextPage),
      });

      const response = await fetch(`/api/social/schedule?${params.toString()}`);
      const payload = (await response.json()) as ApiErrorPayload & HistoryResponse;

      if (!response.ok) {
        setError(payload.error ?? "Falha ao carregar histórico.");
        return;
      }

      setHistory(payload.items);
      setPage(payload.page);
      setTotal(payload.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar histórico.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [companyId]);

  const cancelScheduled = async (postId: string) => {
    setIsCancellingId(postId);
    try {
      const response = await fetch(`/api/social/schedule/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok) {
        setError(payload.error ?? "Falha ao cancelar agendamento.");
        return;
      }

      await fetchHistory(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar agendamento.");
    } finally {
      setIsCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      ) : null}

      <Card accent className="transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
        <CardHeader className="border-b border-[var(--color-border)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#FA5E24]" />
                Histórico de Publicações
              </CardTitle>
              <CardDescription>
                {total} item(ns) carregados com paginação e detalhes completos.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchHistory(page)}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="antd-scope">
            <PostHistoryTable
              history={history}
              page={page}
              total={total}
              isLoading={isLoadingHistory}
              isCancellingId={isCancellingId}
              onPageChange={(nextPage) => void fetchHistory(nextPage)}
              onViewDetails={setDetails}
              onCancelScheduled={(id) => void cancelScheduled(id)}
            />
          </div>
        </CardContent>
      </Card>

      <PostDetailsModal details={details} onClose={() => setDetails(null)} />
    </div>
  );
}
