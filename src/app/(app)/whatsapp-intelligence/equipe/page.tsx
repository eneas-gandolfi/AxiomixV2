/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/equipe/page.tsx
 * Propósito: Visão de equipe com membros, times expandidos e drawer de detalhes.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { Users, UserCog, Inbox, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMembersTable } from "@/components/whatsapp/team-members-table";
import { roleLabel } from "@/components/whatsapp/team-members-table";
import { WorkloadChart } from "@/components/whatsapp/workload-chart";
import { ContactAvatar } from "@/components/whatsapp/contact-avatar";
import { MemberDetailDrawer } from "@/components/whatsapp/member-detail-drawer";

export const dynamic = "force-dynamic";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  conversationCount?: number;
};

type Team = {
  id: string;
  name: string | null;
  members: User[] | null;
};

type InboxInfo = {
  id: string;
  name: string | null;
  channel_type: string | null;
  phone_number: string | null;
};

export default function EquipePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [inboxes, setInboxes] = useState<InboxInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Expandable teams
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Get companyId
  useEffect(() => {
    async function getCompany() {
      try {
        const res = await fetch("/api/auth/company-id", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setCompanyId(data.companyId);
        }
      } catch {
        // Silently fail
      }
    }
    getCompany();
  }, []);

  // Fetch team data
  useEffect(() => {
    if (!companyId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [usersRes, teamsRes, inboxesRes] = await Promise.all([
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listUsers" }),
          }),
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listTeams" }),
          }),
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listInboxes" }),
          }),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users ?? []);
        }
        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.teams ?? []);
        }
        if (inboxesRes.ok) {
          const data = await inboxesRes.json();
          setInboxes(data.inboxes ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const openMemberDrawer = (member: User) => {
    setSelectedMember(member);
    setDrawerOpen(true);
  };

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  // Prepare workload data
  const workloadData = users
    .filter((u) => u.name)
    .map((u) => ({
      name: u.name ?? "Sem nome",
      count: u.conversationCount ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0FAF7]">
              <Users className="h-5 w-5 text-[#2EC4B6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text">{users.length}</p>
              <p className="text-xs text-muted">Agentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0FAF7]">
              <UserCog className="h-5 w-5 text-[#2EC4B6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text">{teams.length}</p>
              <p className="text-xs text-muted">Times</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0FAF7]">
              <Inbox className="h-5 w-5 text-[#2EC4B6]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text">{inboxes.length}</p>
              <p className="text-xs text-muted">Canais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Membros da equipe */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2EC4B6]" />
                <CardTitle className="text-base font-semibold text-text">Membros da Equipe</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="antd-scope">
                <TeamMembersTable
                  members={users}
                  onMemberClick={openMemberDrawer}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: workload + teams + inboxes */}
        <div className="space-y-6">
          <WorkloadChart data={workloadData} />

          {/* Times expandidos */}
          {teams.length > 0 && (
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-text">Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-border overflow-hidden">
                    {/* Team header - clickable */}
                    <button
                      onClick={() => toggleTeam(team.id)}
                      className="flex w-full items-center justify-between px-3 py-2 hover:bg-sidebar transition-colors"
                    >
                      <span className="text-sm text-text">{team.name ?? "Sem nome"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {team.members?.length ?? 0} membro(s)
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted transition-transform ${
                            expandedTeams.has(team.id) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expanded member list */}
                    {expandedTeams.has(team.id) && team.members && team.members.length > 0 && (
                      <div className="border-t border-border bg-background px-3 py-2 space-y-1.5">
                        {team.members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              const fullUser = users.find((u) => u.id === member.id) ?? {
                                ...member,
                                conversationCount: 0,
                              };
                              openMemberDrawer(fullUser);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar transition-colors"
                          >
                            <ContactAvatar name={member.name} size="sm" />
                            <div className="text-left">
                              <p className="text-sm text-text">{member.name ?? "Sem nome"}</p>
                              <p className="text-xs text-muted">{roleLabel(member.role)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Inboxes/Canais */}
          {inboxes.length > 0 && (
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-text">Canais de Atendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inboxes.map((inbox) => (
                  <div key={inbox.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <span className="text-sm text-text">{inbox.name ?? "Sem nome"}</span>
                      {inbox.phone_number && (
                        <p className="text-xs text-muted">{inbox.phone_number}</p>
                      )}
                    </div>
                    {inbox.channel_type && (
                      <span className="rounded bg-background px-2 py-0.5 text-xs text-muted">
                        {inbox.channel_type}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Member Detail Drawer */}
      <MemberDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedMember(null);
        }}
        companyId={companyId}
        member={selectedMember}
        teams={teams}
      />
    </div>
  );
}
