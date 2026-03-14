/**
 * Arquivo: src/components/social/editorial-calendar.tsx
 * Propósito: Calendário editorial visual com drag-and-drop para reagendar posts.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarAgendaView } from "./calendar-agenda-view";
import { PostDetailsModal } from "./post-details-modal";
import type {
  CalendarPostItem,
  SocialPlatform,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type CalendarView = "month" | "week" | "agenda";

type EditorialCalendarProps = {
  companyId: string;
  initialMonth?: { year: number; month: number };
  onCreatePost?: (date: Date) => void;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_OPTIONS: Array<{ value: SocialPublishStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
  { value: "failed", label: "Falha" },
  { value: "cancelled", label: "Cancelado" },
];

const PLATFORM_OPTIONS: Array<{ value: SocialPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "agenda", label: "Agenda" },
];

export function EditorialCalendar({
  companyId,
  initialMonth,
  onCreatePost,
}: EditorialCalendarProps) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(initialMonth?.year ?? now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialMonth?.month ?? now.getMonth() + 1);
  const [posts, setPosts] = useState<CalendarPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SocialPublishStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform[]>([]);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<CalendarPostItem | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        companyId,
        year: String(currentYear),
        month: String(currentMonth),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/social/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [companyId, currentYear, currentMonth, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const goToPrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentYear;
    const month = currentMonth - 1;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Date[] = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }

    return days;
  }, [currentYear, currentMonth]);

  // Filter posts by platform (client-side since API handles status)
  const filteredPosts = useMemo(() => {
    if (platformFilter.length === 0) return posts;
    return posts.filter((post) =>
      post.platforms.some((p) => platformFilter.includes(p))
    );
  }, [posts, platformFilter]);

  // Group posts by date string
  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPostItem[]>();
    for (const post of filteredPosts) {
      const dateKey = new Date(post.scheduledAt).toISOString().slice(0, 10);
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    }
    return map;
  }, [filteredPosts]);

  const handleDropPost = async (postId: string, newDate: Date) => {
    setDraggedPostId(null);
    try {
      const res = await fetch(`/api/social/schedule/${postId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          newScheduledAt: newDate.toISOString(),
        }),
      });

      if (res.ok) {
        await fetchPosts();
      }
    } catch {
      // silently fail
    }
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatformFilter((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isCurrentMonthDay = (date: Date) => {
    return date.getMonth() === currentMonth - 1 && date.getFullYear() === currentYear;
  };

  // Week view label
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startStr = weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return `${startStr} — ${endStr}`;
  }, [weekStart]);

  // Count stats
  const totalPosts = filteredPosts.length;
  const scheduledCount = filteredPosts.filter((p) => p.status === "scheduled").length;
  const publishedCount = filteredPosts.filter((p) => p.status === "published").length;

  return (
    <Card accent className="rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#FA5E24]" />
              Calendário Editorial
            </CardTitle>
            <CardDescription>
              {totalPosts} post{totalPosts !== 1 ? "s" : ""} neste mês
              {scheduledCount > 0 && ` • ${scheduledCount} agendado${scheduledCount !== 1 ? "s" : ""}`}
              {publishedCount > 0 && ` • ${publishedCount} publicado${publishedCount !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {calendarView === "week" ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={goToPrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-[var(--color-text)] min-w-[160px] text-center">
                  {weekLabel}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-[var(--color-text)] min-w-[140px] text-center">
                  {MONTHS[currentMonth - 1]} {currentYear}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>
        </div>

        {/* Filters + View toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {/* View toggle */}
          <div className="flex gap-0.5 bg-[var(--color-surface-2)] rounded-lg p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCalendarView(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  calendarView === opt.value
                    ? "bg-[#FA5E24] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[var(--color-border)]" />

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SocialPublishStatus | "all")}
            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FA5E24] focus:border-transparent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Platform pills */}
          <div className="flex gap-1">
            {PLATFORM_OPTIONS.map((opt) => {
              const isActive = platformFilter.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePlatform(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#FA5E24] text-white"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/80"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#FA5E24]" />
          </div>
        ) : calendarView === "month" ? (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-[var(--color-text-tertiary)] py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const dateKey = date.toISOString().slice(0, 10);
                const dayPosts = postsByDate.get(dateKey) ?? [];

                return (
                  <CalendarDayCell
                    key={index}
                    date={date}
                    posts={dayPosts}
                    isToday={isToday(date)}
                    isCurrentMonth={isCurrentMonthDay(date)}
                    onPostClick={(post) => setSelectedPost(post)}
                    onEmptyClick={(d) => onCreatePost?.(d)}
                    onDropPost={handleDropPost}
                    onDragStart={setDraggedPostId}
                  />
                );
              })}
            </div>
          </>
        ) : calendarView === "week" ? (
          <div className="max-h-[600px] overflow-auto rounded-lg border border-[var(--color-border)]">
            <CalendarWeekView
              weekStart={weekStart}
              posts={filteredPosts}
              isToday={isToday}
              onPostClick={(post) => setSelectedPost(post)}
              onEmptyClick={(d) => onCreatePost?.(d)}
              onDropPost={handleDropPost}
              onDragStart={setDraggedPostId}
            />
          </div>
        ) : (
          <CalendarAgendaView
            posts={filteredPosts}
            onPostClick={(post) => setSelectedPost(post)}
            onCreatePost={onCreatePost}
          />
        )}
      </CardContent>

      {/* Post details modal */}
      {selectedPost && (
        <PostDetailsModal
          details={{
            ...selectedPost,
            externalPostIds: {},
            errorDetails: {},
            publishedAt: null,
            createdAt: selectedPost.scheduledAt,
            qstashMessageId: null,
            thumbnailUrl: selectedPost.thumbnailUrl,
            thumbnailType: null,
          }}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </Card>
  );
}
