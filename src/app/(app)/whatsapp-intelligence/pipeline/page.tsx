/**
 * Arquivo: src/app/(app)/whatsapp-intelligence/pipeline/page.tsx
 * Propósito: Visualização e gestão do Kanban/pipeline via Sofia CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Kanban, Loader2, ChevronDown } from "lucide-react";
import { KanbanBoard } from "@/components/whatsapp/kanban-board";

type Board = {
  id: string;
  name: string | null;
  stages: Array<{
    id: string;
    name: string | null;
    position: number | null;
    cards: Array<{
      id: string;
      title: string | null;
      description: string | null;
      stage_id: string | null;
      source: string | null;
      created_at: string | null;
    }> | null;
  }> | null;
};

export default function PipelinePage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
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

  // Fetch boards list
  useEffect(() => {
    if (!companyId) return;

    async function fetchBoards() {
      setLoading(true);
      try {
        const response = await fetch("/api/whatsapp/kanban/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        if (response.ok) {
          const data = await response.json();
          const boardsList = data.boards ?? [];
          setBoards(boardsList);
          if (boardsList.length > 0 && !selectedBoardId) {
            setSelectedBoardId(boardsList[0].id);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBoards();
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
          Crie um pipeline no Sofia CRM para visualizá-lo aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Board selector */}
      {boards.length > 1 && (
        <div className="flex items-center gap-2">
          <Kanban className="h-4 w-4 text-[#2EC4B6]" />
          <select
            value={selectedBoardId ?? ""}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text focus:border-[#2EC4B6] focus:outline-none"
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
          onRefresh={fetchBoard}
        />
      ) : (
        <p className="text-sm text-muted">Selecione um pipeline para visualizar.</p>
      )}
    </div>
  );
}
