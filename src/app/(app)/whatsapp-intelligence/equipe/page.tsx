/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/equipe/page.tsx
 * Propósito: Visão de equipe com membros, times e distribuição de workload.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import { Users, UserCog, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMembersTable } from "@/components/whatsapp/team-members-table";
import { WorkloadChart } from "@/components/whatsapp/workload-chart";

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
                <TeamMembersTable members={users} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: workload + teams + inboxes */}
        <div className="space-y-6">
          <WorkloadChart data={workloadData} />

          {/* Times */}
          {teams.length > 0 && (
            <Card className="rounded-xl border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-text">Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-text">{team.name ?? "Sem nome"}</span>
                    <span className="text-xs text-muted">
                      {team.members?.length ?? 0} membro(s)
                    </span>
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
    </div>
  );
}
