/**
 * Arquivo: src/components/rag/document-list.tsx
 * Proposito: Tabela Ant Design para listagem de documentos RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Table, Badge, Popconfirm, App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";

type RagDocumentRow = {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  scope: "company" | "global";
  source_key: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  total_chunks: number | null;
  error_message: string | null;
  created_at: string | null;
};

type DocumentListProps = {
  companyId: string;
  refreshKey?: number;
};

const STATUS_CONFIG: Record<
  RagDocumentRow["status"],
  { text: string; color: string }
> = {
  pending: { text: "Pendente", color: "gold" },
  processing: { text: "Processando", color: "blue" },
  ready: { text: "Pronto", color: "green" },
  failed: { text: "Erro", color: "red" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DocumentList({ companyId, refreshKey }: DocumentListProps) {
  const { message } = App.useApp();
  const [documents, setDocuments] = useState<RagDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchDocuments = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          companyId,
          page: String(currentPage),
          pageSize: "20",
        });

        const response = await fetch(`/api/rag/documents?${params}`);
        if (!response.ok) throw new Error("Falha ao carregar documentos.");

        const data = await response.json();
        setDocuments(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch {
        message.error("Erro ao carregar documentos.");
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    fetchDocuments(page);
  }, [fetchDocuments, page, refreshKey]);

  // Polling para documentos em processamento
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => fetchDocuments(page), 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments, page]);

  const handleDelete = useCallback(
    async (documentId: string) => {
      try {
        const response = await fetch(
          `/api/rag/documents/${documentId}?companyId=${companyId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Falha ao excluir documento.");

        message.success("Documento excluido.");
        fetchDocuments(page);
      } catch {
        message.error("Erro ao excluir documento.");
      }
    },
    [companyId, fetchDocuments, page]
  );

  const handleRetry = useCallback(
    async (documentId: string) => {
      try {
        const response = await fetch(
          `/api/rag/documents/${documentId}?companyId=${companyId}`,
          { method: "PATCH" }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Falha ao reprocessar documento.");
        }

        message.success("Reprocessamento iniciado.");
        fetchDocuments(page);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Erro ao reprocessar documento.");
      }
    },
    [companyId, fetchDocuments, page]
  );

  const columns: ColumnsType<RagDocumentRow> = [
    {
      title: "Documento",
      dataIndex: "file_name",
      key: "file_name",
      ellipsis: true,
      render: (name: string, record) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-foreground truncate">{name}</span>
          <span
            className={
              record.scope === "global"
                ? "shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                : "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
            }
          >
            {record.scope === "global" ? "Padrao Axiomix" : "Empresa"}
          </span>
        </div>
      ),
    },
    {
      title: "Tamanho",
      dataIndex: "file_size",
      key: "file_size",
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: RagDocumentRow["status"]) => {
        const config = STATUS_CONFIG[status];
        return (
          <Badge
            color={config.color}
            text={
              <span className="flex items-center gap-1.5 text-sm">
                {status === "processing" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {config.text}
              </span>
            }
          />
        );
      },
    },
    {
      title: "Chunks",
      dataIndex: "total_chunks",
      key: "total_chunks",
      width: 80,
      render: (val: number | null) => val ?? "-",
    },
    {
      title: "Data",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (val: string | null) => formatDate(val),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, record) =>
        record.scope === "global" ? (
          <span className="text-xs text-muted">Somente leitura</span>
        ) : (
          <div className="flex items-center gap-1">
            {(record.status === "failed" || record.status === "pending") && (
              <button
                className="p-1.5 rounded-md hover:bg-orange-50 text-muted hover:text-primary transition-colors"
                title="Tentar novamente"
                onClick={() => handleRetry(record.id)}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <Popconfirm
              title="Excluir documento?"
              description="Todos os chunks e embeddings serao removidos."
              onConfirm={() => handleDelete(record.id)}
              okText="Excluir"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <button
                className="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
                title="Excluir documento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Popconfirm>
          </div>
        ),
    },
  ];

  return (
    <div className="antd-scope">
      <Table<RagDocumentRow>
        {...axiomixTableProps}
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={axiomixPagination({
          current: page,
          total,
          onChange: setPage,
        })}
        locale={{ emptyText: <p className="py-6 text-muted">Nenhum documento enviado.</p> }}
      />
    </div>
  );
}
