/**
 * Arquivo: src/components/settings/team-settings.tsx
 * Propósito: Listar e gerenciar membros da empresa (papel + remoção).
 * Autor: AXIOMIX
 * Data: 2026-04-18
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Shield, User, Trash2, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Role = "owner" | "admin" | "member";

type TeamMember = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
  isCurrentUser: boolean;
};

type TeamApiResponse = {
  currentUserId?: string;
  currentUserRole?: Role;
  members?: TeamMember[];
  error?: string;
};

type PendingAction = {
  userId: string;
  kind: "update" | "delete";
};

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrador",
  member: "Membro",
};

function RoleIcon({ role }: { role: Role }) {
  if (role === "owner") return <Crown className="h-4 w-4 text-primary" />;
  if (role === "admin") return <Shield className="h-4 w-4 text-info" />;
  return <User className="h-4 w-4 text-muted" />;
}

export function TeamSettings() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch("/api/settings/team");
      const data = (await res.json()) as TeamApiResponse;
      if (!res.ok) {
        setLoadError(data.error ?? "Falha ao carregar equipe.");
        return;
      }
      setMembers(data.members ?? []);
      setCurrentUserRole(data.currentUserRole ?? null);
    } catch {
      setLoadError("Falha ao carregar equipe.");
    }
  }, []);

  useEffect(() => {
    fetchMembers().finally(() => setLoading(false));
  }, [fetchMembers]);

  const canEditMember = (member: TeamMember): boolean => {
    if (member.isCurrentUser) return false;
    if (member.role === "owner") return false;
    if (currentUserRole === "owner") return true;
    if (currentUserRole === "admin") return member.role !== "admin";
    return false;
  };

  const availableRolesFor = (member: TeamMember): Role[] => {
    if (currentUserRole === "owner") return ["admin", "member"];
    if (currentUserRole === "admin") return ["member"];
    return [];
  };

  const handleRoleChange = async (member: TeamMember, nextRole: Role) => {
    if (nextRole === member.role) return;
    setPending({ userId: member.userId, kind: "update" });
    try {
      const res = await fetch(`/api/settings/team/${member.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Erro", description: data.error ?? "Falha ao atualizar papel.", variant: "destructive" });
        return;
      }
      toast({ title: "Papel atualizado", description: `${member.email} agora é ${ROLE_LABEL[nextRole]}.` });
      await fetchMembers();
    } finally {
      setPending(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `Remover ${member.email} da equipe? Ele perderá acesso imediatamente.`
    );
    if (!confirmed) return;
    setPending({ userId: member.userId, kind: "delete" });
    try {
      const res = await fetch(`/api/settings/team/${member.userId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Erro", description: data.error ?? "Falha ao remover.", variant: "destructive" });
        return;
      }
      toast({ title: "Membro removido", description: `${member.email} não faz mais parte da equipe.` });
      await fetchMembers();
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando equipe...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
        <AlertCircle className="inline h-4 w-4 mr-2" />
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Equipe</h2>
        <p className="mt-0.5 text-sm text-muted">
          Gerencie os membros que têm acesso a esta empresa no Axiomix.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-primary-light/20 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted space-y-1">
            <p>
              <span className="font-medium text-text">Owner:</span> acesso total, não pode ser removido.
            </p>
            <p>
              <span className="font-medium text-text">Administrador:</span> gerencia integrações, equipe e acessa
              custos de IA.
            </p>
            <p>
              <span className="font-medium text-text">Membro:</span> acesso operacional, sem configurações avançadas.
            </p>
          </div>
        </div>
      </div>

      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-text text-base">Membros ({members.length})</CardTitle>
          <CardDescription className="text-muted">
            Convite por e-mail será adicionado em breve. Por enquanto, novos membros cadastram-se
            e o owner define o papel aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted">Nenhum membro encontrado.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const editable = canEditMember(member);
                const roles = availableRolesFor(member);
                const isPendingUpdate = pending?.userId === member.userId && pending.kind === "update";
                const isPendingDelete = pending?.userId === member.userId && pending.kind === "delete";

                return (
                  <div
                    key={member.userId}
                    className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-sidebar flex items-center justify-center overflow-hidden">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text truncate">
                          {member.fullName ?? member.email}
                          {member.isCurrentUser ? (
                            <span className="ml-2 text-xs text-muted">(você)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-md bg-sidebar px-2 py-1">
                        <RoleIcon role={member.role} />
                        {editable && roles.length > 0 ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as Role)}
                            disabled={isPendingUpdate || isPendingDelete}
                            className="bg-transparent text-xs text-text outline-none cursor-pointer disabled:cursor-wait"
                          >
                            {member.role === "admin" ? (
                              <option value="admin">{ROLE_LABEL.admin}</option>
                            ) : null}
                            {member.role === "member" ? (
                              <option value="member">{ROLE_LABEL.member}</option>
                            ) : null}
                            {roles
                              .filter((r) => r !== member.role)
                              .map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-xs text-text">{ROLE_LABEL[member.role]}</span>
                        )}
                      </div>

                      {editable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member)}
                          disabled={isPendingUpdate || isPendingDelete}
                          aria-label="Remover membro"
                        >
                          {isPendingDelete ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-danger" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
