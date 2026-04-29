/**
 * Arquivo: src/components/campaigns/campaign-detail-client.tsx
 * Propósito: Pagina de detalhe de campanha com progresso real-time e tabela de recipients.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Table, Select } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Loader2,
  CheckCircle,
  CheckCheck,
  Eye,
  XCircle,
  Clock,
  Users,
} from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";
import { CampaignStatusBadge, RecipientStatusBadge } from "./campaign-status-badge";
import type {
  Campaign,
  CampaignRecipient,
  CampaignStats,
  RecipientStatus,
  DeliveryStatus,
} from "@/types/modules/campaigns.types";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from "@/types/modules/campaigns.types";

type CampaignDetailClientProps = {
  companyId: string;
  initialCampaign: Campaign;
  initialRecipients: CampaignRecipient[];
  initialRecipientsTotal: number;
};

function StatCard({
  label,
  value,
  total,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  icon: typeof CheckCircle;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-[var(--color-text-secondary)]">
          {label}
        </span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--color-text)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">
        {pct}% do total
      </div>
    </div>
  );
}

export function CampaignDetailClient({
  companyId,
  initialCampaign,
  initialRecipients,
  initialRecipientsTotal,
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [recipientsTotal, setRecipientsTotal] = useState(initialRecipientsTotal);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<RecipientStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh enquanto running
  useEffect(() => {
    if (campaign.status === "running") {
      intervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaigns/${campaign.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId }),
          });
          const data = await res.json();
          if (data.campaign) {
            setCampaign(data.campaign);
          }
        } catch {
          // silently fail
        }
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [campaign.status, campaign.id, companyId]);

  const fetchRecipients = useCallback(
    async (page: number, status?: RecipientStatus | "") => {
      setLoading(true);
      try {
        const body: Record<string, unknown> = { companyId, page, pageSize: 20 };
        if (status) body.status = status;

        const res = await fetch(`/api/campaigns/${campaign.id}/recipients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.recipients) {
          setRecipients(data.recipients);
          setRecipientsTotal(data.total ?? 0);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [campaign.id, companyId]
  );

  const handleAction = useCallback(
    async (action: "start" | "pause" | "resume" | "delete") => {
      setActionLoading(true);
      try {
        if (action === "delete") {
          await fetch(`/api/campaigns/${campaign.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "delete" }),
          });
          router.push("/campanhas");
          return;
        }

        const endpoint =
          action === "start"
            ? `/api/campaigns/${campaign.id}/start`
            : `/api/campaigns/${campaign.id}/pause`;

        const body: Record<string, unknown> = { companyId };
        if (action === "resume" || action === "pause") {
          body.action = action;
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (data.campaign) {
          setCampaign(data.campaign);
        }
      } catch {
        // silently fail
      } finally {
        setActionLoading(false);
      }
    },
    [campaign.id, companyId, router]
  );

  const stats = campaign.stats;
  const totalProcessed = stats.sent + stats.failed + stats.skipped;
  const progressPct = stats.total > 0 ? Math.round((totalProcessed / stats.total) * 100) : 0;

  const recipientColumns: ColumnsType<CampaignRecipient> = [
    {
      title: "Contato",
      key: "contact",
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div className="text-sm font-medium text-[var(--color-text)]">
            {record.contact_name || "Sem nome"}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">
            {record.contact_phone}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => <RecipientStatusBadge status={status} />,
    },
    {
      title: "Enviado em",
      dataIndex: "sent_at",
      key: "sent_at",
      width: 160,
      render: (date: string | null) =>
        date ? (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {new Date(date).toLocaleString("pt-BR")}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
        ),
    },
    {
      title: "Entrega",
      dataIndex: "delivery_status",
      key: "delivery_status",
      width: 120,
      render: (status: DeliveryStatus | null) =>
        status ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `${DELIVERY_STATUS_COLORS[status]}15`,
              color: DELIVERY_STATUS_COLORS[status],
            }}
          >
            {status === "read" ? "✓✓" : status === "delivered" ? "✓✓" : "✓"}
            {" "}{DELIVERY_STATUS_LABELS[status]}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
        ),
    },
    {
      title: "Erro",
      dataIndex: "error_message",
      key: "error_message",
      ellipsis: true,
      render: (msg: string | null) =>
        msg ? (
          <span className="text-xs text-red-500">{msg}</span>
        ) : (
          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[var(--color-text)]">{campaign.name}</h2>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Template: <span className="font-medium">{campaign.template_name}</span> ({campaign.language})
          </p>
        </div>

        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button
              type="button"
              onClick={() => handleAction("start")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors disabled:opacity-40"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Iniciar
            </button>
          )}

          {campaign.status === "running" && (
            <button
              type="button"
              onClick={() => handleAction("pause")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-40"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
              Pausar
            </button>
          )}

          {campaign.status === "paused" && (
            <button
              type="button"
              onClick={() => handleAction("resume")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1fba59] transition-colors disabled:opacity-40"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Retomar
            </button>
          )}

          {(campaign.status === "draft" || campaign.status === "failed") && (
            <button
              type="button"
              onClick={() => handleAction("delete")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">Progresso</span>
          <span className="font-medium text-[var(--color-text)]">{progressPct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background:
                campaign.status === "failed"
                  ? "#FF4D4F"
                  : campaign.status === "completed"
                    ? "#52C41A"
                    : "#25D366",
            }}
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} total={stats.total} icon={Users} color="#8A8A8A" />
        <StatCard label="Enviados" value={stats.sent} total={stats.total} icon={CheckCircle} color="#52C41A" />
        <StatCard label="Entregues" value={stats.delivered ?? 0} total={stats.total} icon={CheckCheck} color="#1677FF" />
        <StatCard label="Lidos" value={stats.read ?? 0} total={stats.total} icon={Eye} color="var(--module-accent)" />
        <StatCard label="Falhas" value={stats.failed} total={stats.total} icon={XCircle} color="#FF4D4F" />
        <StatCard label="Ignorados" value={stats.skipped} total={stats.total} icon={Clock} color="#FADB14" />
      </div>

      {/* Recipients table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Destinatários</h3>
          <div className="antd-scope">
            <Select
              value={recipientStatusFilter || undefined}
              onChange={(value) => {
                const filter = (value ?? "") as RecipientStatus | "";
                setRecipientStatusFilter(filter);
                setRecipientPage(1);
                fetchRecipients(1, filter);
              }}
              placeholder="Todos os status"
              allowClear
              options={[
                { value: "pending", label: "Pendentes" },
                { value: "sent", label: "Enviados" },
                { value: "failed", label: "Falhas" },
                { value: "skipped", label: "Ignorados" },
              ]}
              className="w-40"
            />
          </div>
        </div>

        <div className="antd-scope">
          <Table
            {...axiomixTableProps}
            columns={recipientColumns}
            dataSource={recipients}
            rowKey="id"
            loading={loading}
            pagination={axiomixPagination({
              current: recipientPage,
              total: recipientsTotal,
              onChange: (p) => {
                setRecipientPage(p);
                fetchRecipients(p, recipientStatusFilter);
              },
            })}
          />
        </div>
      </div>
    </div>
  );
}
