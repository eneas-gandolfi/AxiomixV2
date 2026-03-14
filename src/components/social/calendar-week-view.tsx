/**
 * Arquivo: src/components/social/calendar-week-view.tsx
 * Propósito: Visualização semanal do calendário editorial com time slots.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useMemo, useState, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { CalendarPostCard } from "./calendar-post-card";
import type { CalendarPostItem } from "@/types/modules/social-publisher.types";

type CalendarWeekViewProps = {
  weekStart: Date;
  posts: CalendarPostItem[];
  isToday: (date: Date) => boolean;
  onPostClick: (post: CalendarPostItem) => void;
  onEmptyClick: (date: Date) => void;
  onDropPost: (postId: string, newDate: Date) => void;
  onDragStart: (postId: string) => void;
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOUR_START = 6;
const HOUR_END = 23;
const SLOT_HEIGHT = 50;

export function CalendarWeekView({
  weekStart,
  posts,
  isToday,
  onPostClick,
  onEmptyClick,
  onDropPost,
  onDragStart,
}: CalendarWeekViewProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const hours = useMemo(() => {
    return Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  }, []);

  const postsByDayAndHour = useMemo(() => {
    const map = new Map<string, CalendarPostItem[]>();
    for (const post of posts) {
      const d = new Date(post.scheduledAt);
      const dateKey = d.toISOString().slice(0, 10);
      const hour = d.getHours();
      const key = `${dateKey}-${hour}`;
      const arr = map.get(key) ?? [];
      arr.push(post);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const handleDragOver = (e: DragEvent, cellKey: string) => {
    e.preventDefault();
    setDragOverCell(cellKey);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as { id: string; time: string };
      const originalDate = new Date(data.time);
      const newDate = new Date(date);
      newDate.setHours(hour, originalDate.getMinutes(), 0, 0);
      onDropPost(data.id, newDate);
    } catch {
      const newDate = new Date(date);
      newDate.setHours(hour, 0, 0, 0);
      onDropPost(raw, newDate);
    }
  };

  return (
    <div className="overflow-auto">
      {/* Header com dias da semana */}
      <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-10">
        <div className="p-2" />
        {weekDays.map((date, i) => {
          const today = isToday(date);
          return (
            <div
              key={i}
              className={`text-center py-2 border-l border-[var(--color-border)] ${
                today ? "bg-[var(--color-primary-dim)]/30" : ""
              }`}
            >
              <p className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase">
                {WEEKDAYS_SHORT[date.getDay()]}
              </p>
              <p className={`text-lg font-semibold ${
                today
                  ? "bg-[#FA5E24] text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                  : "text-[var(--color-text)]"
              }`}>
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            {/* Hour label */}
            <div
              className="text-[10px] font-medium text-[var(--color-text-tertiary)] text-right pr-2 pt-1 border-t border-[var(--color-border)]"
              style={{ height: SLOT_HEIGHT }}
            >
              {hour.toString().padStart(2, "0")}:00
            </div>

            {/* Day cells */}
            {weekDays.map((date, dayIndex) => {
              const dateKey = date.toISOString().slice(0, 10);
              const cellKey = `${dateKey}-${hour}`;
              const cellPosts = postsByDayAndHour.get(cellKey) ?? [];
              const isDraggedOver = dragOverCell === cellKey;

              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`border-l border-t border-[var(--color-border)] relative group ${
                    isDraggedOver
                      ? "bg-[var(--color-primary-dim)]/20 ring-1 ring-inset ring-[#FA5E24]"
                      : isToday(date)
                      ? "bg-[var(--color-primary-dim)]/10"
                      : ""
                  }`}
                  style={{ height: SLOT_HEIGHT }}
                  onDragOver={(e) => handleDragOver(e, cellKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, date, hour)}
                >
                  {/* Add button */}
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date(date);
                      newDate.setHours(hour, 0, 0, 0);
                      onEmptyClick(newDate);
                    }}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[#FA5E24] transition-all z-10"
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* Posts */}
                  <div className="space-y-0.5 p-0.5 overflow-hidden">
                    {cellPosts.map((post) => (
                      <CalendarPostCard
                        key={post.id}
                        post={post}
                        onClick={onPostClick}
                        isDraggable={post.status === "scheduled"}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
