/**
 * Arquivo: src/components/whatsapp/conversations-table.tsx
 * Propósito: Tabela Ant Design para lista de conversas do WhatsApp Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useRouter } from "next/navigation";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ShoppingCart,
  Headphones,
  AlertTriangle,
  HelpCircle,
  XCircle,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { ContactAvatar } from "./contact-avatar";
import { ConversationQuickActions } from "./conversation-quick-actions";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";

type Sentiment = "positivo" | "neutro" | "negativo";

type ConversationData = {
  id: string;
  external_id: string | null;
  contact_name: string | null;
  remote_jid: string;
  status: string | null;
  last_message_at: string | null;
  sentiment: Sentiment | null;
  intent: string | null;
};

type ConversationsTableProps = {
  conversations: ConversationData[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
};

export function sentimentBadgeClass(sentiment?: Sentiment | null) {
  if (sentiment === "positivo") return "bg-success-light text-success";
  if (sentiment === "negativo") return "bg-danger-light text-danger";
  if (sentiment === "neutro") return "bg-warning-light text-warning";
  return "bg-background text-muted";
}

export function sentimentLabel(sentiment?: Sentiment | null) {
  if (!sentiment) return "Sem analise";
  return sentiment;
}

export function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

export function getIntentIcon(intent?: string | null) {
  switch (intent) {
    case "compra":
      return ShoppingCart;
    case "suporte":
      return Headphones;
    case "reclamacao":
      return AlertTriangle;
    case "duvida":
      return HelpCircle;
    case "cancelamento":
      return XCircle;
    default:
      return MoreHorizontal;
  }
}

export function getIntentColor(intent?: string | null) {
  switch (intent) {
    case "compra":
      return "text-success";
    case "suporte":
      return "text-primary";
    case "reclamacao":
      return "text-danger";
    case "duvida":
      return "text-warning";
    case "cancelamento":
      return "text-danger";
    default:
      return "text-muted";
  }
}

export function getTimeSinceLastMessage(lastMessageAt?: string | null): string {
  if (!lastMessageAt) return "";

  const now = new Date();
  const lastMessage = new Date(lastMessageAt);
  const diffMs = now.getTime() - lastMessage.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}min atrás`;
  }
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return "";
}

export function formatContactDisplay(contactName: string | null, remoteJid: string): string {
  if (contactName && contactName.trim().length > 0) {
    return contactName.trim();
  }

  const phone = remoteJid.replace(/@s.whatsapp.net|@c.us/g, "");

  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const numero = phone.substring(4);

    if (numero.length === 9) {
      return `(${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    } else if (numero.length === 8) {
      return `(${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;
    }
  }

  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") || phone;
}

function isNegativeRecent(conversation: ConversationData): boolean {
  return (
    conversation.sentiment === "negativo" &&
    !!conversation.last_message_at &&
    new Date().getTime() - new Date(conversation.last_message_at).getTime() <
      24 * 60 * 60 * 1000
  );
}

export function ConversationsTable({
  conversations,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onSelectAll,
}: ConversationsTableProps) {
  const router = useRouter();

  const columns: ColumnsType<ConversationData> = [
    {
      title: "Contato",
      dataIndex: "contact_name",
      width: 280,
      render: (_, record) => {
        const IntentIcon = getIntentIcon(record.intent);
        const intentColor = getIntentColor(record.intent);
        const timeSince = getTimeSinceLastMessage(record.last_message_at);
        const negRecent = isNegativeRecent(record);

        return (
          <div className="flex items-center gap-3">
            <ContactAvatar name={record.contact_name} size="md" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {record.intent && (
                  <IntentIcon className={`h-4 w-4 flex-shrink-0 ${intentColor}`} />
                )}
                <p className="text-sm font-medium text-text truncate">
                  {formatContactDisplay(record.contact_name, record.remote_jid)}
                </p>
                {timeSince && negRecent && (
                  <span className="flex items-center gap-1 rounded-full bg-danger-light px-2 py-0.5 text-xs font-medium text-danger flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {timeSince}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-light">
                <span>{formatDate(record.last_message_at)}</span>
                {record.external_id && (
                  <>
                    <span>•</span>
                    <span>ID: {record.external_id}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Última Msg",
      dataIndex: "last_message_at",
      width: 160,
      responsive: ["md"],
      render: (value: string | null) => {
        const timeSince = getTimeSinceLastMessage(value);
        return (
          <span className="text-xs text-muted">
            {timeSince || formatDate(value)}
          </span>
        );
      },
    },
    {
      title: "Intenção",
      dataIndex: "intent",
      width: 140,
      responsive: ["md"],
      render: (intent: string | null) => {
        if (!intent) return <span className="text-xs text-muted-light">—</span>;
        const IntentIcon = getIntentIcon(intent);
        const intentColor = getIntentColor(intent);
        return (
          <span
            className={`flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-medium w-fit ${intentColor}`}
          >
            <IntentIcon className="h-3 w-3" />
            {intent}
          </span>
        );
      },
    },
    {
      title: "Sentimento",
      dataIndex: "sentiment",
      width: 130,
      render: (sentiment: Sentiment | null) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${sentimentBadgeClass(sentiment)}`}
        >
          {sentimentLabel(sentiment)}
        </span>
      ),
    },
    {
      title: "Ações",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => {
        if (selectionMode) return null;
        const conversationUrl = `/whatsapp-intelligence/conversas/${record.id}`;
        return (
          <div className="quick-actions opacity-0 transition-opacity">
            <ConversationQuickActions
              conversationId={record.id}
              conversationUrl={conversationUrl}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Table<ConversationData>
      {...axiomixTableProps}
      columns={columns}
      dataSource={conversations}
      rowKey="id"
      pagination={axiomixPagination()}
      rowSelection={
        selectionMode
          ? {
              selectedRowKeys: Array.from(selectedIds),
              onChange: (selectedRowKeys) => {
                const newSet = new Set(selectedRowKeys as string[]);
                // Sync by toggling differences
                const currentIds = new Set(selectedIds);
                for (const id of newSet) {
                  if (!currentIds.has(id)) onToggleSelection(id);
                }
                for (const id of currentIds) {
                  if (!newSet.has(id)) onToggleSelection(id);
                }
              },
              onSelectAll: () => onSelectAll(),
            }
          : undefined
      }
      onRow={(record) => ({
        onClick: (e) => {
          if (selectionMode) {
            e.preventDefault();
            onToggleSelection(record.id);
          } else {
            router.push(`/whatsapp-intelligence/conversas/${record.id}`);
          }
        },
        style: { cursor: "pointer" },
      })}
      rowClassName={(record) => {
        const classes: string[] = [];
        if (isNegativeRecent(record)) {
          classes.push("ant-table-row-negative-recent");
        }
        if (selectedIds.has(record.id)) {
          classes.push("ant-table-row-selected-axiomix");
        }
        return classes.join(" ");
      }}
      locale={{
        emptyText: (
          <p className="py-8 text-sm text-muted">
            Nenhuma conversa encontrada com os filtros aplicados.
          </p>
        ),
      }}
    />
  );
}
