/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/pipeline/page.tsx
 * Propósito: Visualização e gestão do Kanban/pipeline via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Kanban, Loader2 } from "lucide-react";
import { KanbanBoard } from "@/components/whatsapp/kanban-board";
import type { RichKanbanCard, KanbanStage, TeamMember } from "@/components/whatsapp/kanban-types";

export const dynamic = "force-dynamic";

type Board = {
  id: string;
  name: string | null;
  stages: KanbanStage[] | null;
};

export default function PipelinePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

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

  // Fetch boards list + team members
  useEffect(() => {
    if (!companyId) return;

    async function fetchInitialData() {
      setLoading(true);
      try {
        const [boardsRes, teamRes] = await Promise.all([
          fetch("/api/whatsapp/kanban/boards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId }),
          }),
          fetch("/api/whatsapp/team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, action: "listUsers" }),
          }),
        ]);

        if (boardsRes.ok) {
          const data = await boardsRes.json();
          const boardsList = data.boards ?? [];
          setBoards(boardsList);
          if (boardsList.length > 0 && !selectedBoardId) {
            setSelectedBoardId(boardsList[0].id);
          }
        }

        if (teamRes.ok) {
          const data = await teamRes.json();
          const users = (data.users ?? []) as Array<{ id: string; name?: string | null; email?: string | null }>;
          setTeamMembers(
            users.map((u) => ({
              id: u.id,
              name: u.name ?? null,
              email: u.email ?? null,
            }))
          );
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [companyId]);

  const fetchBoard = useCallback(async () => {
    if (!companyId || !selectedBoardId) return;
    setLoadingBoard(true);
    try {
      const response = await fetch(`/api/whatsapp/kanban/boards/${selectedBoardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedBoard(data.board);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingBoard(false);
    }
  }, [companyId, selectedBoardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  if (!companyId || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <Kanban className="mb-4 h-12 w-12 text-muted" />
        <p className="text-lg font-medium text-text">Nenhum pipeline encontrado</p>
        <p className="mt-2 text-sm text-muted">
          Crie um pipeline no Evo CRM para visualizá-lo aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Board selector */}
      {boards.length > 1 && (
        <div className="flex items-center gap-2">
          <Kanban className="h-4 w-4 text-[var(--module-accent)]" />
          <select
            value={selectedBoardId ?? ""}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-[var(--module-accent)] focus:outline-none"
          >
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name ?? `Pipeline ${board.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Board */}
      {loadingBoard ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      ) : selectedBoard?.stages ? (
        <KanbanBoard
          boardId={selectedBoard.id}
          boardName={selectedBoard.name}
          stages={selectedBoard.stages}
          companyId={companyId}
          teamMembers={teamMembers}
          onRefresh={fetchBoard}
        />
      ) : (
        <p className="text-sm text-muted">Selecione um pipeline para visualizar.</p>
      )}
    </div>
  );
}
