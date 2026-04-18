/**
 * Arquivo: src/components/whatsapp/contacts-table.tsx
 * Propósito: Tabela Ant Design para lista de contatos do Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Phone, Mail, Calendar } from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";

type ContactLabel = {
  id: string;
  name: string | null;
  color: string | null;
};

type ContactData = {
  id: string;
  name: string | null;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  created_at: string | null;
  labels: ContactLabel[] | null;
};

type ContactsTableProps = {
  contacts: ContactData[];
  onContactClick?: (contactId: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function ContactsTable({ contacts, onContactClick }: ContactsTableProps) {
  const columns: ColumnsType<ContactData> = [
    {
      title: "Nome",
      dataIndex: "name",
      width: 160,
      render: (name: string | null) => (
        <span className="text-sm font-medium text-text">{name ?? "Sem nome"}</span>
      ),
    },
    {
      title: "Telefone",
      dataIndex: "phone",
      width: 140,
      render: (phone: string | null, record) => (
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <Phone className="h-3 w-3" />
          {record.phone_e164 ?? phone ?? "—"}
        </span>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 200,
      responsive: ["md"],
      render: (email: string | null) =>
        email ? (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Mail className="h-3 w-3" />
            {email}
          </span>
        ) : (
          <span className="text-xs text-muted-light">—</span>
        ),
    },
    {
      title: "Labels",
      dataIndex: "labels",
      width: 200,
      responsive: ["lg"],
      render: (labels: ContactLabel[] | null) => {
        if (!labels || labels.length === 0) {
          return <span className="text-xs text-muted-light">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 3).map((label) => (
              <Tag
                key={label.id}
                color={label.color ?? undefined}
                className="text-xs"
              >
                {label.name ?? "?"}
              </Tag>
            ))}
            {labels.length > 3 && (
              <span className="text-xs text-muted">+{labels.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      title: "Criado em",
      dataIndex: "created_at",
      width: 120,
      responsive: ["lg"],
      render: (value: string | null) => (
        <span className="flex items-center gap-1 text-xs text-muted">
          <Calendar className="h-3 w-3" />
          {formatDate(value)}
        </span>
      ),
    },
  ];

  return (
    <Table<ContactData>
      {...axiomixTableProps}
      columns={columns}
      dataSource={contacts}
      rowKey="id"
      pagination={axiomixPagination()}
      onRow={(record) => ({
        onClick: () => onContactClick?.(record.id),
        style: { cursor: onContactClick ? "pointer" : "default" },
      })}
      locale={{
        emptyText: (
          <p className="py-8 text-sm text-muted">
            Nenhum contato encontrado.
          </p>
        ),
      }}
    />
  );
}
