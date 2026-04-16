/**
 * Arquivo: src/components/social/calendar-agenda-view.tsx
 * Propósito: Visualização em lista (agenda) dos posts do calendário editorial.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useMemo } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "./platform-icons";
import type {
  CalendarPostItem,
  SocialPlatform,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type CalendarAgendaViewProps = {
  posts: CalendarPostItem[];
  onPostClick: (post: CalendarPostItem) => void;
  onCreatePost?: (date: Date) => void;
};

const STATUS_LABELS: Record<SocialPublishStatus, { label: string; color: string }> = {
  scheduled: { label: "Agendado", color: "bg-[var(--color-warning-light)] text-[var(--color-warning)]" },
  processing: { label: "Processando", color: "bg-[var(--color-primary-dim)] text-[#FA5E24]" },
  published: { label: "Publicado", color: "bg-[#DCFCE7] text-[#22C55E]" },
  partial: { label: "Parcial", color: "bg-[var(--color-warning-light)] text-[var(--color-warning)]" },
  failed: { label: "Falha", color: "bg-[#FEE2E2] text-[var(--color-danger)]" },
  cancelled: { label: "Cancelado", color: "bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]" },
};

export function CalendarAgendaView({
  posts,
  onPostClick,
  onCreatePost,
}: CalendarAgendaViewProps) {
  const groupedByDate = useMemo(() => {
    const sorted = [...posts].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    const groups: { dateKey: string; dateLabel: string; posts: CalendarPostItem[] }[] = [];
    let currentKey = "";

    for (const post of sorted) {
      const d = new Date(post.scheduledAt);
      const key = d.toISOString().slice(0, 10);

      if (key !== currentKey) {
        currentKey = key;
        groups.push({
          dateKey: key,
          dateLabel: d.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          posts: [],
        });
      }

      groups[groups.length - 1].posts.push(post);
    }

    return groups;
  }, [posts]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarPlus className="h-10 w-10 text-[var(--color-text-tertiary)] mb-3" />
        <p className="text-sm font-medium text-[var(--color-text)]">
          Nenhum post agendado neste mês
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 mb-4">
          Crie seu primeiro post para visualizá-lo aqui
        </p>
        {onCreatePost && (
          <Button
            type="button"
            size="sm"
            onClick={() => onCreatePost(new Date())}
          >
            <CalendarPlus className="h-4 w-4" />
            Criar Post
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedByDate.map((group) => (
        <div key={group.dateKey}>
          {/* Date header */}
          <div className="sticky top-0 bg-[var(--color-surface)] z-10 px-2 py-1.5 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] capitalize">
              {group.dateLabel}
            </p>
          </div>

          {/* Posts for this date */}
          <div className="divide-y divide-[var(--color-border)]">
            {group.posts.map((post) => {
              const time = new Date(post.scheduledAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const statusInfo = STATUS_LABELS[post.status];

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onPostClick(post)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors text-left"
                >
                  {/* Time */}
                  <span className="text-sm font-semibold text-[var(--color-text)] min-w-[45px]">
                    {time}
                  </span>

                  {/* Thumbnail */}
                  {post.thumbnailUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={post.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-2)] flex-shrink-0" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] truncate">
                      {post.caption || "Sem legenda"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Platform icons */}
                      <div className="flex gap-0.5">
                        {post.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p as SocialPlatform} className="h-3 w-3" />
                        ))}
                      </div>
                      {/* Post type */}
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {post.postType}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
