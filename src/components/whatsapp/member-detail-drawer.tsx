/**
 * Arquivo: src/components/whatsapp/member-detail-drawer.tsx
 * Propósito: Drawer lateral com detalhes do membro e atribuição rápida de conversa.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer } from "antd";
import {
  Loader2,
  Mail,
  Shield,
  Users,
  MessageSquare,
  Check,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "./contact-avatar";
import { roleLabel } from "./team-members-table";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
};

type Team = {
  id: string;
  name: string | null;
  members: User[] | null;
};

type RecentConversation = {
  id: string;
  external_id: string | null;
  contact_name: string | null;
  contact_avatar_url: string | null;
  status: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
};

type MemberDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  member: User | null;
  teams: Team[];
};

export function MemberDetailDrawer({
  open,
  onClose,
  companyId,
  member,
  teams,
}: MemberDetailDrawerProps) {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);

  const memberTeams = member
    ? teams.filter((t) => t.members?.some((m) => m.id === member.id))
    : [];

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/whatsapp/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "listRecentConversations" }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingConversations(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && member) {
      setAssignedIds(new Set());
      setErrorId(null);
      loadConversations();
    }
    if (!open) {
      setConversations([]);
      setAssignedIds(new Set());
      setErrorId(null);
    }
  }, [open, member, loadConversations]);

  const handleAssign = async (conversation: RecentConversation) => {
    if (!member || !conversation.external_id) return;

    setAssigningId(conversation.id);
    setErrorId(null);
    try {
      const res = await fetch("/api/whatsapp/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          action: "assignConversation",
          conversationExternalId: conversation.external_id,
          assigneeId: member.id,
        }),
      });
      if (res.ok) {
        setAssignedIds((prev) => new Set(prev).add(conversation.id));
      } else {
        setErrorId(conversation.id);
      }
    } catch {
      setErrorId(conversation.id);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="antd-scope">
      <Drawer
        title={null}
        open={open}
        onClose={onClose}
        placement="right"
        size="default"
        styles={{
          header: { borderBottom: "1px solid #EDE9E0", padding: "16px 24px" },
          body: { background: "#FDFCF9", padding: "0" },
        }}
      >
        {member ? (
          <div className="divide-y divide-[#EDE9E0]">
            {/* Profile */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-4">
                <ContactAvatar name={member.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-text truncate">
                    {member.name ?? "Sem nome"}
                  </h3>
                  {member.email && (
                    <p className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted">
                    <Shield className="h-3 w-3" />
                    {roleLabel(member.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* Teams */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-[#2EC4B6]" />
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  Times
                </label>
              </div>
              {memberTeams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {memberTeams.map((team) => (
                    <span
                      key={team.id}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-text"
                    >
                      {team.name ?? "Sem nome"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nenhum time</p>
              )}
            </div>

            {/* Quick Assign */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-[#2EC4B6]" />
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  Atribuir Conversa
                </label>
              </div>

              {loadingConversations ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-2 max-h-[340px] overflow-y-auto">
                  {conversations.map((conv) => {
                    const isAssigned = assignedIds.has(conv.id);
                    const isAssigning = assigningId === conv.id;
                    const hasError = errorId === conv.id;

                    return (
                      <div key={conv.id}>
                        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                          <ContactAvatar
                            name={conv.contact_name}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-text truncate">
                              {conv.contact_name ?? conv.external_id ?? "Sem nome"}
                            </p>
                            <div className="flex items-center gap-2">
                              {conv.last_message_at && (
                                <span className="text-[10px] text-muted-light">
                                  {new Date(conv.last_message_at).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                              {conv.assigned_to && !isAssigned ? (
                                <span className="text-[10px] text-muted">
                                  Atribuído
                                </span>
                              ) : !isAssigned ? (
                                <span className="text-[10px] text-[#2EC4B6]">
                                  Sem responsável
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {isAssigned ? (
                            <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-600 bg-green-50">
                              <Check className="h-3 w-3" />
                              Atribuído
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAssign(conv)}
                              disabled={isAssigning}
                            >
                              {isAssigning ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserPlus className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>

                        {hasError && (
                          <p className="mt-1 px-3 text-xs text-red-500">
                            Falha ao atribuir. Tente novamente.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">Nenhuma conversa recente.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-muted text-center">
            Membro não encontrado.
          </p>
        )}
      </Drawer>
    </div>
  );
}
