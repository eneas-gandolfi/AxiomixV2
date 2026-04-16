/**
 * Arquivo: src/components/social/post-history-table.tsx
 * Propósito: Tabela Ant Design para histórico de posts do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Eye, Trash2, RefreshCw, Image as ImageIcon, Video, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { axiomixPagination, axiomixTableProps, AXIOMIX_PAGE_SIZE } from "@/lib/ant-table-defaults";
import { formatDate, postTypeLabel, progressStateLabel } from "@/lib/social/utils";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type ScheduledHistoryItem,
  type SocialPostType,
  type SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type PostHistoryTableProps = {
  history: ScheduledHistoryItem[];
  page: number;
  total: number;
  pageSize?: number;
  isLoading: boolean;
  isCancellingId: string | null;
  onPageChange: (page: number) => void;
  onViewDetails: (item: ScheduledHistoryItem) => void;
  onCancelScheduled: (id: string) => void;
};

export function PostHistoryTable({
  history,
  page,
  total,
  pageSize = AXIOMIX_PAGE_SIZE,
  isLoading,
  isCancellingId,
  onPageChange,
  onViewDetails,
  onCancelScheduled,
}: PostHistoryTableProps) {
  const columns: ColumnsType<ScheduledHistoryItem> = [
    {
      title: "Thumb",
      dataIndex: "thumbnailUrl",
      width: 60,
      render: (_, record) => (
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-background border border-border">
          {record.thumbnailUrl ? (
            <img
              loading="lazy"
              decoding="async"
              src={record.thumbnailUrl}
              alt="thumb"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {record.postType === "video" ? (
                <Video className="h-4 w-4 text-muted-light" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-light" />
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "postType",
      width: 100,
      render: (postType: SocialPostType) => (
        <span className="text-sm text-text">{postTypeLabel(postType)}</span>
      ),
    },
    {
      title: "Agendado",
      dataIndex: "scheduledAt",
      width: 160,
      render: (value: string) => (
        <span className="text-xs text-muted">{formatDate(value)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      render: (status: SocialPublishStatus) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      ),
    },
    {
      title: "Legenda",
      dataIndex: "caption",
      ellipsis: true,
      render: (caption: string | null) => (
        <span className="text-sm text-text">
          {caption || "Sem legenda"}
        </span>
      ),
    },
    {
      title: "Plataformas",
      dataIndex: "platforms",
      width: 200,
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.platforms.map((platform) => {
            const progress = record.progress[platform];
            return (
              <span
                key={`${record.id}-${platform}`}
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  progress?.status === "ok"
                    ? "bg-success-light text-success"
                    : progress?.status === "error"
                    ? "bg-danger-light text-danger"
                    : progress?.status === "processing"
                    ? "bg-warning-light text-warning"
                    : "bg-sidebar text-muted"
                }`}
              >
                {platform}: {progressStateLabel(progress?.status ?? "pending")}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      title: "Ações",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(record);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Detalhes
          </Button>

          {record.status === "scheduled" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancelScheduled(record.id);
              }}
              disabled={isCancellingId === record.id}
            >
              {isCancellingId === record.id ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table<ScheduledHistoryItem>
      {...axiomixTableProps}
      columns={columns}
      dataSource={history}
      rowKey="id"
      loading={isLoading}
      pagination={axiomixPagination({
        current: page,
        total,
        pageSize,
        onChange: (p) => onPageChange(p),
      })}
      locale={{
        emptyText: (
          <div className="py-8">
            <History className="h-12 w-12 mx-auto text-muted-light mb-3" />
            <p className="text-sm text-muted">Nenhum post encontrado</p>
            <p className="text-xs text-muted-light mt-1">
              Seus posts agendados aparecerão aqui
            </p>
          </div>
        ),
      }}
    />
  );
}
