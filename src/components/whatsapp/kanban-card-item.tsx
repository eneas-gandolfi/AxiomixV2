/**
 * Arquivo: src/components/whatsapp/kanban-card-item.tsx
 * Propósito: Card arrastável do Kanban com dados ricos e useSortable.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, User, DollarSign, Calendar } from "lucide-react";
import type { RichKanbanCard } from "./kanban-types";

type KanbanCardItemProps = {
  card: RichKanbanCard;
  onClick?: (cardId: string) => void;
  isDraggingOverlay?: boolean;
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  alta: { bg: "bg-red-100", text: "text-red-700", label: "Alta" },
  high: { bg: "bg-red-100", text: "text-red-700", label: "Alta" },
  media: { bg: "bg-amber-100", text: "text-amber-700", label: "Média" },
  média: { bg: "bg-amber-100", text: "text-amber-700", label: "Média" },
  medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Média" },
  baixa: { bg: "bg-green-100", text: "text-green-700", label: "Baixa" },
  low: { bg: "bg-green-100", text: "text-green-700", label: "Baixa" },
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function KanbanCardItem({ card, onClick, isDraggingOverlay }: KanbanCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityKey = card.priority?.toLowerCase() ?? "";
  const priorityStyle = PRIORITY_STYLES[priorityKey];
  const tags = card.tags?.slice(0, 3) ?? [];

  return (
    <div
      ref={isDraggingOverlay ? undefined : setNodeRef}
      style={isDraggingOverlay ? undefined : style}
      className={`group rounded-lg border border-border bg-card transition-all hover:border-border-strong cursor-pointer ${
        isDraggingOverlay ? "shadow-lg ring-2 ring-[#2EC4B6]/40" : ""
      }`}
      onClick={() => onClick?.(card.id)}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            {...(isDraggingOverlay ? {} : { ...attributes, ...listeners })}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            {/* Title + priority badge */}
            <div className="flex items-start gap-2">
              <p className="text-sm font-medium text-text truncate flex-1">
                {card.title ?? "Sem título"}
              </p>
              {priorityStyle && (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                  {priorityStyle.label}
                </span>
              )}
            </div>

            {/* Description */}
            {card.description && (
              <p className="mt-1 text-xs text-muted line-clamp-2">
                {card.description}
              </p>
            )}

            {/* Value */}
            {typeof card.value_amount === "number" && card.value_amount > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-[#2EC4B6]" />
                <span className="text-xs font-semibold text-[#2EC4B6]">
                  {formatCurrency(card.value_amount)}
                </span>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: source + assignee + conversation + date */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {card.source && (
                <span className="rounded bg-[#E0FAF7] px-1.5 py-0.5 text-[10px] text-[#2EC4B6]">
                  {card.source}
                </span>
              )}
              {card.assigned_to && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted">
                  <User className="h-2.5 w-2.5" />
                  {card.assigned_to}
                </span>
              )}
              {card.conversation_id && (
                <span className="flex items-center gap-0.5 text-[10px] text-[#2EC4B6]">
                  <MessageSquare className="h-2.5 w-2.5" />
                </span>
              )}
              {card.created_at && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-light ml-auto">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(card.created_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
