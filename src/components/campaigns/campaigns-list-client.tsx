/**
 * Arquivo: src/components/campaigns/campaigns-list-client.tsx
 * Propósito: Componente client da listagem de campanhas com tabela Ant Design.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusCircle } from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";
import { CampaignStatusBadge } from "./campaign-status-badge";
import type { Campaign, CampaignStats } from "@/types/modules/campaigns.types";

type CampaignsListClientProps = {
  companyId: string;
  initialCampaigns: Campaign[];
  initialTotal: number;
};

export function CampaignsListClient({
  companyId,
  initialCampaigns,
  initialTotal,
}: CampaignsListClientProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, page: targetPage, pageSize: 20 }),
        });
        const data = await res.json();
        if (data.campaigns) {
          setCampaigns(data.campaigns);
          setTotal(data.total ?? 0);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchCampaigns(newPage);
    },
    [fetchCampaigns]
  );

  function formatStats(stats: CampaignStats) {
    if (stats.total === 0) return "—";
    return `${stats.sent}/${stats.total}`;
  }

  function formatProgress(stats: CampaignStats) {
    if (stats.total === 0) return 0;
    return Math.round(((stats.sent + stats.failed) / stats.total) * 100);
  }

  const columns: ColumnsType<Campaign> = [
    {
      title: "Nome",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (name: string, record) => (
        <button
          type="button"
          onClick={() => router.push(`/campanhas/${record.id}`)}
          className="text-sm font-medium text-[var(--color-text)] hover:text-[#25D366] transition-colors text-left"
        >
          {name}
        </button>
      ),
    },
    {
      title: "Template",
      dataIndex: "template_name",
      key: "template_name",
      width: 180,
      ellipsis: true,
      render: (name: string) => (
        <span className="text-xs text-[var(--color-text-secondary)]">{name}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => <CampaignStatusBadge status={status} />,
    },
    {
      title: "Progresso",
      key: "progress",
      width: 140,
      render: (_, record) => {
        const pct = formatProgress(record.stats);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#25D366] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
              {formatStats(record.stats)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Criada em",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (date: string) => (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          Suas Campanhas
        </h2>
        <button
          type="button"
          onClick={() => router.push("/campanhas/nova")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      <div className="antd-scope">
        <Table
          {...axiomixTableProps}
          columns={columns}
          dataSource={campaigns}
          rowKey="id"
          loading={loading}
          pagination={axiomixPagination({
            current: page,
            total,
            onChange: handlePageChange,
          })}
          onRow={(record) => ({
            onClick: () => router.push(`/campanhas/${record.id}`),
            className: "cursor-pointer",
          })}
        />
      </div>
    </div>
  );
}
