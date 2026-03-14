/**
 * Arquivo: src/components/social/demand-card.tsx
 * Propósito: Card de uma demanda para exibição no kanban board.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { MessageSquare, User, Calendar } from "lucide-react";
import { DemandStatusBadge } from "./demand-status-badge";
import { PlatformIcon } from "./platform-icons";
import type { ContentDemandWithMeta } from "@/types/modules/content-demands.types";

type DemandCardProps = {
  demand: ContentDemandWithMeta;
  onClick: (demand: ContentDemandWithMeta) => void;
};

export function DemandCard({ demand, onClick }: DemandCardProps) {
  const isOverdue = demand.dueDate && new Date(demand.dueDate).getTime() < Date.now();

  return (
    <button
      type="button"
      onClick={() => onClick(demand)}
      className="w-full text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:shadow-card hover:border-[var(--color-border-strong)] transition-all space-y-2"
    >
      {/* Thumbnail */}
      {demand.thumbnailUrl && (
        <img
          src={demand.thumbnailUrl}
          alt=""
          className="w-full h-24 rounded-lg object-cover"
        />
      )}

      {/* Title */}
      <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2">
        {demand.title}
      </p>

      {/* Platforms */}
      {demand.platforms.length > 0 && (
        <div className="flex gap-1">
          {demand.platforms.map((p) => (
            <div key={p} className="h-5 w-5 rounded bg-[var(--color-surface-2)] flex items-center justify-center">
              <PlatformIcon platform={p} className="h-3 w-3" />
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          {demand.assigneeName && (
            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <User className="h-3 w-3" />
              {demand.assigneeName.split(" ")[0]}
            </span>
          )}

          {/* Comments */}
          {demand.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[var(--color-text-tertiary)]">
              <MessageSquare className="h-3 w-3" />
              {demand.commentCount}
            </span>
          )}
        </div>

        {/* Due date */}
        {demand.dueDate && (
          <span className={`flex items-center gap-0.5 ${isOverdue ? "text-[var(--color-danger)]" : "text-[var(--color-text-tertiary)]"}`}>
            <Calendar className="h-3 w-3" />
            {new Date(demand.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </button>
  );
}
