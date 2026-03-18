"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, Filter, History, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeProgress, normalizeStringMap } from "@/lib/social/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostDetailsModal } from "./post-details-modal";
import { PostHistoryTable } from "./post-history-table";
import type {
  ScheduledHistoryItem,
  HistoryResponse,
  ApiErrorPayload,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type StatusFilter = "all" | SocialPublishStatus;

type HistoryPageClientProps = {
  companyId: string;
  initialHistory: HistoryResponse;
};

export function HistoryPageClient({
  companyId,
  initialHistory,
}: HistoryPageClientProps) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [history, setHistory] = useState<ScheduledHistoryItem[]>(initialHistory.items);
  const [page, setPage] = useState(initialHistory.page);
  const [total, setTotal] = useState(initialHistory.total);
  const [totalPages, setTotalPages] = useState(initialHistory.totalPages);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);
  const [details, setDetails] = useState<ScheduledHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (nextPage: number, nextStatus: StatusFilter, nextFrom: string, nextTo: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoadingHistory(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          companyId,
          page: String(nextPage),
        });

        if (nextStatus !== "all") {
          params.set("status", nextStatus);
        }

        if (nextFrom) {
          params.set("dateFrom", new Date(nextFrom).toISOString());
        }

        if (nextTo) {
          const finalDate = new Date(nextTo);
          finalDate.setHours(23, 59, 59, 999);
          params.set("dateTo", finalDate.toISOString());
        }

        const response = await fetch(`/api/social/schedule?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as ApiErrorPayload & HistoryResponse;

        if (!response.ok) {
          setError(payload.error ?? "Falha ao carregar historico.");
          return;
        }

        setHistory(payload.items);
        setPage(payload.page);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar historico.");
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [companyId]
  );

  const cancelScheduled = useCallback(
    async (postId: string) => {
      setIsCancellingId(postId);

      try {
        const response = await fetch(`/api/social/schedule/${postId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        const payload = (await response.json()) as ApiErrorPayload;

        if (!response.ok) {
          setError(payload.error ?? "Falha ao cancelar.");
          return;
        }

        await fetchHistory(page, statusFilter, dateFrom, dateTo);
      } catch (cancelError) {
        setError(cancelError instanceof Error ? cancelError.message : "Falha ao cancelar.");
      } finally {
        setIsCancellingId(null);
      }
    },
    [companyId, dateFrom, dateTo, fetchHistory, page, statusFilter]
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`social-history-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_posts",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (typeof payload.new !== "object" || payload.new === null) {
            return;
          }

          const row = payload.new as Record<string, unknown>;
          const rowId = typeof row.id === "string" ? row.id : null;
          if (!rowId) {
            return;
          }

          startTransition(() => {
            setHistory((previous) => {
              const next = [...previous];
              const index = next.findIndex((item) => item.id === rowId);
              if (index < 0) {
                return previous;
              }

              next[index] = {
                ...next[index],
                status:
                  row.status === "scheduled" ||
                  row.status === "processing" ||
                  row.status === "published" ||
                  row.status === "partial" ||
                  row.status === "failed" ||
                  row.status === "cancelled"
                    ? row.status
                    : next[index].status,
                progress: normalizeProgress(row.progress),
                externalPostIds: normalizeStringMap(row.external_post_ids),
                errorDetails: normalizeStringMap(row.error_details),
                publishedAt:
                  typeof row.published_at === "string"
                    ? row.published_at
                    : next[index].publishedAt,
              };
              return next;
            });

            setDetails((previous) => {
              if (!previous || previous.id !== rowId) {
                return previous;
              }

              return {
                ...previous,
                status:
                  row.status === "scheduled" ||
                  row.status === "processing" ||
                  row.status === "published" ||
                  row.status === "partial" ||
                  row.status === "failed" ||
                  row.status === "cancelled"
                    ? row.status
                    : previous.status,
                progress: normalizeProgress(row.progress),
                externalPostIds: normalizeStringMap(row.external_post_ids),
                errorDetails: normalizeStringMap(row.error_details),
                publishedAt:
                  typeof row.published_at === "string" ? row.published_at : previous.publishedAt,
              };
            });
          });
        }
      )
      .subscribe();

    return () => {
      abortControllerRef.current?.abort();
      void channel.unsubscribe();
    };
  }, [companyId]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      ) : null}

      <Card accent className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#FA5E24]" />
            Histórico de Publicações
          </CardTitle>
          <CardDescription>
            Visualize e gerencie seus posts agendados. {total} item(ns) em {totalPages} página(s).
          </CardDescription>

          <div className="flex flex-wrap gap-3 pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <select
                value={statusFilter}
                onChange={(event) => {
                  const nextStatus = event.target.value as StatusFilter;
                  setStatusFilter(nextStatus);
                  void fetchHistory(1, nextStatus, dateFrom, dateTo);
                }}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FA5E24]"
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendado</option>
                <option value="processing">Processando</option>
                <option value="published">Publicado</option>
                <option value="partial">Parcial</option>
                <option value="failed">Falha</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FA5E24]"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#FA5E24]"
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchHistory(1, statusFilter, dateFrom, dateTo)}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              Aplicar Filtros
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="antd-scope">
            <PostHistoryTable
              history={history}
              page={page}
              total={total}
              pageSize={initialHistory.pageSize}
              isLoading={isLoadingHistory}
              isCancellingId={isCancellingId}
              onPageChange={(nextPage) => void fetchHistory(nextPage, statusFilter, dateFrom, dateTo)}
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
