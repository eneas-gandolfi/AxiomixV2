/**
 * Arquivo: src/components/social/calendar-post-card.tsx
 * Propósito: Mini-card de post para exibição no calendário editorial.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { GripVertical } from "lucide-react";
import { PlatformIcon } from "./platform-icons";
import type { CalendarPostItem, SocialPlatform, SocialPublishStatus } from "@/types/modules/social-publisher.types";

type CalendarPostCardProps = {
  post: CalendarPostItem;
  onClick: (post: CalendarPostItem) => void;
  isDraggable: boolean;
  onDragStart?: (postId: string) => void;
};

const STATUS_DOTS: Record<SocialPublishStatus, string> = {
  scheduled: "bg-[var(--color-warning)]",
  processing: "bg-[#FA5E24]",
  published: "bg-[#22C55E]",
  partial: "bg-[var(--color-warning)]",
  failed: "bg-[var(--color-danger)]",
  cancelled: "bg-[var(--color-text-tertiary)]",
};


export function CalendarPostCard({
  post,
  onClick,
  isDraggable,
  onDragStart,
}: CalendarPostCardProps) {
  const time = new Date(post.scheduledAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={() => onClick(post)}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", JSON.stringify({ id: post.id, time: post.scheduledAt }));
        onDragStart?.(post.id);
      }}
      className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors text-[10px] group ${
        isDraggable
          ? "hover:bg-[var(--color-primary-dim)] cursor-grab active:cursor-grabbing"
          : "hover:bg-[var(--color-surface-2)] cursor-pointer"
      }`}
    >
      {isDraggable && (
        <GripVertical className="h-3 w-3 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 flex-shrink-0" />
      )}

      {/* Status dot */}
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOTS[post.status]}`} />

      {/* Thumbnail */}
      {post.thumbnailUrl && (
        <img
          src={post.thumbnailUrl}
          alt=""
          className="w-5 h-5 rounded object-cover flex-shrink-0"
        />
      )}

      {/* Platform icons */}
      <div className="flex gap-0.5 flex-shrink-0">
        {post.platforms.slice(0, 2).map((p) => (
          <PlatformIcon key={p} platform={p as SocialPlatform} className="h-2.5 w-2.5" />
        ))}
      </div>

      {/* Time */}
      <span className="text-[var(--color-text-secondary)] font-medium flex-shrink-0">
        {time}
      </span>
    </button>
  );
}
