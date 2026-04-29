/**
 * Arquivo: src/components/social/demands-table.tsx
 * Propósito: Tabela Ant Design para listagem de demandas de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { User, MessageSquare } from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";
import { DemandStatusBadge } from "./demand-status-badge";
import { PlatformIcon } from "./platform-icons";
import type { ContentDemandWithMeta } from "@/types/modules/content-demands.types";

type DemandsTableProps = {
  demands: ContentDemandWithMeta[];
  page: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onViewDemand: (demand: ContentDemandWithMeta) => void;
};

export function DemandsTable({
  demands,
  page,
  total,
  isLoading,
  onPageChange,
  onViewDemand,
}: DemandsTableProps) {
  const columns: ColumnsType<ContentDemandWithMeta> = [
    {
      title: "Título",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string, record) => (
        <button
          type="button"
          onClick={() => onViewDemand(record)}
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--module-accent)] transition-colors text-left"
        >
          {title}
        </button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status) => <DemandStatusBadge status={status} />,
    },
    {
      title: "Plataformas",
      key: "platforms",
      width: 120,
      render: (_, record) => (
        <div className="flex gap-1">
          {record.platforms.map((p) => (
            <div key={p} className="h-6 w-6 rounded bg-[var(--color-surface-2)] flex items-center justify-center" title={p}>
              <PlatformIcon platform={p} className="h-3.5 w-3.5" />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Responsável",
      key: "assignee",
      width: 140,
      render: (_, record) =>
        record.assigneeName ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <User className="h-3.5 w-3.5" />
            {record.assigneeName}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
        ),
    },
    {
      title: "Prazo",
      key: "dueDate",
      width: 110,
      render: (_, record) => {
        if (!record.dueDate) return <span className="text-xs text-[var(--color-text-tertiary)]">—</span>;
        const isOverdue = new Date(record.dueDate).getTime() < Date.now();
        return (
          <span className={`text-xs ${isOverdue ? "text-[var(--color-danger)] font-medium" : "text-[var(--color-text-secondary)]"}`}>
            {new Date(record.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        );
      },
    },
    {
      title: "",
      key: "comments",
      width: 50,
      align: "center",
      render: (_, record) =>
        record.commentCount > 0 ? (
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-text-tertiary)] justify-center">
            <MessageSquare className="h-3.5 w-3.5" />
            {record.commentCount}
          </span>
        ) : null,
    },
  ];

  return (
    <Table
      {...axiomixTableProps}
      columns={columns}
      dataSource={demands}
      rowKey="id"
      loading={isLoading}
      pagination={axiomixPagination({
        current: page,
        total,
        onChange: onPageChange,
      })}
      onRow={(record) => ({
        onClick: () => onViewDemand(record),
        className: "cursor-pointer",
      })}
      locale={{ emptyText: "Nenhuma demanda encontrada." }}
    />
  );
}
