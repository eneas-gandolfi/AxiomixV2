/**
 * Arquivo: src/components/social/calendar-day-cell.tsx
 * Propósito: Célula de dia no calendário editorial com drop zone para drag-and-drop.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useState, useRef, useEffect, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { CalendarPostCard } from "./calendar-post-card";
import type { CalendarPostItem } from "@/types/modules/social-publisher.types";

type CalendarDayCellProps = {
  date: Date;
  posts: CalendarPostItem[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onPostClick: (post: CalendarPostItem) => void;
  onEmptyClick: (date: Date) => void;
  onDropPost: (postId: string, newDate: Date) => void;
  onDragStart: (postId: string) => void;
};

const MAX_VISIBLE = 4;

export function CalendarDayCell({
  date,
  posts,
  isToday,
  isCurrentMonth,
  onPostClick,
  onEmptyClick,
  onDropPost,
  onDragStart,
}: CalendarDayCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const day = date.getDate();
  const visiblePosts = posts.slice(0, MAX_VISIBLE);
  const hiddenCount = posts.length - MAX_VISIBLE;

  useEffect(() => {
    if (!showAllPosts) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAllPosts(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAllPosts]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as { id: string; time: string };
      const originalDate = new Date(data.time);
      const newDate = new Date(date);
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      onDropPost(data.id, newDate);
    } catch {
      const newDate = new Date(date);
      newDate.setHours(12, 0, 0, 0);
      onDropPost(raw, newDate);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (isCurrentMonth && posts.length === 0) {
          onEmptyClick(date);
        }
      }}
      role={isCurrentMonth && posts.length === 0 ? "button" : undefined}
      className={`relative min-h-[100px] border border-[var(--color-border)] rounded-lg p-1.5 transition-all ${
        !isCurrentMonth
          ? "bg-[var(--color-surface-2)]/50 opacity-50"
          : posts.length === 0
            ? "bg-[var(--color-surface)] cursor-pointer hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/[0.03]"
            : "bg-[var(--color-surface)]"
      } ${
        isToday
          ? "border-2 border-[var(--color-primary)] bg-[#8B5CF6]/[0.06]"
          : ""
      } ${
        isDragOver
          ? "ring-2 ring-[#8B5CF6]/40 bg-[#8B5CF6]/[0.08]"
          : ""
      }`}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium ${
            isToday
              ? "bg-[#8B5CF6] text-white w-5 h-5 rounded-full flex items-center justify-center"
              : isCurrentMonth
              ? "text-[var(--color-text)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          {day}
        </span>
        {isCurrentMonth && (
          <button
            type="button"
            onClick={() => onEmptyClick(date)}
            className="opacity-0 hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-[#8B5CF6]/10 text-[var(--color-text-tertiary)] hover:text-[#8B5CF6] transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-0.5">
        {visiblePosts.map((post) => (
          <CalendarPostCard
            key={post.id}
            post={post}
            onClick={onPostClick}
            isDraggable={post.status === "scheduled"}
            onDragStart={onDragStart}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllPosts(true)}
            className="w-full text-center text-[10px] text-[var(--color-text-tertiary)] hover:text-[#8B5CF6] py-0.5 rounded hover:bg-[var(--color-surface-2)] transition-colors"
          >
            +{hiddenCount} mais
          </button>
        )}
      </div>

      {/* Popover com todos os posts */}
      {showAllPosts && (
        <div
          ref={popoverRef}
          className="absolute z-50 left-0 top-full mt-1 w-64 max-h-48 overflow-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 space-y-0.5"
        >
          <p className="text-[10px] font-medium text-[var(--color-text-tertiary)] px-1 mb-1">
            {posts.length} posts em {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </p>
          {posts.map((post) => (
            <CalendarPostCard
              key={post.id}
              post={post}
              onClick={(p) => {
                setShowAllPosts(false);
                onPostClick(p);
              }}
              isDraggable={post.status === "scheduled"}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
