/**
 * Arquivo: src/components/whatsapp/team-members-table.tsx
 * Propósito: Tabela de membros da equipe com métricas de atendimento.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { User, Mail, Shield } from "lucide-react";
import { axiomixPagination, axiomixTableProps } from "@/lib/ant-table-defaults";
import { ContactAvatar } from "./contact-avatar";

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  conversationCount?: number;
};

type TeamMembersTableProps = {
  members: TeamMember[];
};

function roleLabel(role?: string | null) {
  switch (role) {
    case "admin":
      return "Admin";
    case "agent":
      return "Agente";
    case "supervisor":
      return "Supervisor";
    default:
      return role ?? "—";
  }
}

export function TeamMembersTable({ members }: TeamMembersTableProps) {
  const columns: ColumnsType<TeamMember> = [
    {
      title: "Membro",
      dataIndex: "name",
      width: 250,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <ContactAvatar name={record.name} size="md" />
          <div>
            <p className="text-sm font-medium text-text">{record.name ?? "Sem nome"}</p>
            {record.email && (
              <p className="flex items-center gap-1 text-xs text-muted">
                <Mail className="h-3 w-3" />
                {record.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Função",
      dataIndex: "role",
      width: 130,
      render: (role: string | null) => (
        <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted w-fit">
          <Shield className="h-3 w-3" />
          {roleLabel(role)}
        </span>
      ),
    },
    {
      title: "Conversas ativas",
      dataIndex: "conversationCount",
      width: 140,
      sorter: (a, b) => (a.conversationCount ?? 0) - (b.conversationCount ?? 0),
      render: (count?: number) => (
        <span className="text-sm font-medium text-text">{count ?? 0}</span>
      ),
    },
  ];

  return (
    <Table<TeamMember>
      {...axiomixTableProps}
      columns={columns}
      dataSource={members}
      rowKey="id"
      pagination={axiomixPagination()}
      locale={{
        emptyText: (
          <p className="py-8 text-sm text-muted">
            Nenhum membro encontrado.
          </p>
        ),
      }}
    />
  );
}
