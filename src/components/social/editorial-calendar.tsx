/**
 * Arquivo: src/components/social/editorial-calendar.tsx
 * Propósito: Calendário editorial visual com drag-and-drop para reagendar posts.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckSquare, ChevronLeft, ChevronRight, Calendar, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarWeekView } from "./calendar-week-view";
import { CalendarAgendaView } from "./calendar-agenda-view";
import { PostDetailsModal } from "./post-details-modal";
import {
  DEFAULT_COMPANY_TIMEZONE,
  utcIsoToZonedLocalDate,
  zonedLocalToUtcIso,
} from "@/lib/social/timezone";
import type {
  CalendarPostItem,
  SocialPlatform,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

type CalendarView = "month" | "week" | "agenda";

type EditorialCalendarProps = {
  companyId: string;
  companyTimezone?: string;
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
  companyTimezone = DEFAULT_COMPANY_TIMEZONE,
  initialMonth,
  onCreatePost,
}: EditorialCalendarProps) {
  const router = useRouter();
  const handleCreatePost = useCallback(
    (date: Date) => {
      if (onCreatePost) {
        onCreatePost(date);
      } else {
        // Fallback: navega para a aba Agendar com a data como query param
        const isoDate = date.toISOString();
        router.push(`/social-publisher?scheduleAt=${encodeURIComponent(isoDate)}`);
      }
    },
    [onCreatePost, router]
  );
  const tz = companyTimezone;
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(initialMonth?.year ?? now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialMonth?.month ?? now.getMonth() + 1);
  const [posts, setPosts] = useState<CalendarPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SocialPublishStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform[]>([]);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<CalendarPostItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
      } else {
        setError("Falha ao carregar posts do calendário.");
      }
    } catch {
      setError("Erro de conexão ao carregar posts.");
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

  // Group posts by date string — usando o dia visivel no TZ da empresa.
  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPostItem[]>();
    for (const post of filteredPosts) {
      const zoned = utcIsoToZonedLocalDate(post.scheduledAt, tz);
      const dateKey = `${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, "0")}-${String(zoned.getDate()).padStart(2, "0")}`;
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    }
    return map;
  }, [filteredPosts, tz]);

  const handleDropPost = async (postId: string, newDate: Date) => {
    setDraggedPostId(null);
    setError(null);
    try {
      // Preserva a hora original do post, muda apenas o dia (no TZ da empresa).
      const original = posts.find((p) => p.id === postId);
      const originalZoned = original
        ? utcIsoToZonedLocalDate(original.scheduledAt, tz)
        : null;
      const hour = originalZoned?.getHours() ?? 12;
      const minute = originalZoned?.getMinutes() ?? 0;
      const newIso = zonedLocalToUtcIso(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        hour,
        minute,
        tz
      );

      const res = await fetch(`/api/social/schedule/${postId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          newScheduledAt: newIso,
        }),
      });

      if (res.ok) {
        await fetchPosts();
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Falha ao reagendar post.");
      }
    } catch {
      setError("Erro de conexão ao reagendar post.");
    }
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatformFilter((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleSelection = (postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkCancel = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Cancelar ${selectedIds.size} post(s) agendado(s)?`)) return;
    setIsBulkWorking(true);
    setError(null);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/social/schedule/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    if (failed > 0) {
      setError(`${failed} de ${ids.length} cancelamento(s) falharam.`);
    }
    await fetchPosts();
    exitSelectionMode();
    setIsBulkWorking(false);
  };

  const handleBulkReschedule = async (deltaDays: number) => {
    if (selectedIds.size === 0) return;
    setIsBulkWorking(true);
    setError(null);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => {
        const post = posts.find((p) => p.id === id);
        if (!post) return Promise.reject(new Error("post-not-found"));
        const zoned = utcIsoToZonedLocalDate(post.scheduledAt, tz);
        const newZoned = new Date(zoned);
        newZoned.setDate(newZoned.getDate() + deltaDays);
        const newIso = zonedLocalToUtcIso(
          newZoned.getFullYear(),
          newZoned.getMonth(),
          newZoned.getDate(),
          newZoned.getHours(),
          newZoned.getMinutes(),
          tz
        );
        return fetch(`/api/social/schedule/${id}/reschedule`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, newScheduledAt: newIso }),
        });
      })
    );
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    if (failed > 0) {
      setError(`${failed} de ${ids.length} reagendamento(s) falharam.`);
    }
    await fetchPosts();
    exitSelectionMode();
    setIsBulkWorking(false);
  };

  const scheduledPostsInView = useMemo(
    () => filteredPosts.filter((p) => p.status === "scheduled"),
    [filteredPosts]
  );

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
              <Calendar className="h-5 w-5 text-[var(--module-accent)]" />
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
                    ? "bg-[var(--module-accent)] text-white shadow-sm"
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
            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--module-accent,#8B5CF6)] focus:border-transparent"
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
                      ? "bg-[var(--module-accent)] text-white"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/80"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto">
            <Button
              type="button"
              size="sm"
              variant={selectionMode ? "default" : "secondary"}
              disabled={!selectionMode && scheduledPostsInView.length === 0}
              onClick={() => {
                if (selectionMode) {
                  exitSelectionMode();
                } else {
                  setSelectionMode(true);
                }
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? "Sair da seleção" : "Selecionar múltiplos"}
            </Button>
          </div>
        </div>

        {/* Bulk actions panel */}
        {selectionMode && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {selectedIds.size} selecionado(s) de {scheduledPostsInView.length} agendado(s)
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedIds(new Set(scheduledPostsInView.map((p) => p.id)))
                  }
                  disabled={scheduledPostsInView.length === 0}
                >
                  Selecionar todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkReschedule(1)}
                  disabled={selectedIds.size === 0 || isBulkWorking}
                >
                  +1 dia
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkReschedule(7)}
                  disabled={selectedIds.size === 0 || isBulkWorking}
                >
                  +1 semana
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkCancel}
                  disabled={selectedIds.size === 0 || isBulkWorking}
                  className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/80"
                >
                  {isBulkWorking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Cancelar selecionados
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={exitSelectionMode}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {scheduledPostsInView.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Nenhum post agendado no período atual.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {scheduledPostsInView.map((post) => {
                  const checked = selectedIds.has(post.id);
                  const when = utcIsoToZonedLocalDate(post.scheduledAt, tz);
                  const label = `${when.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
                  return (
                    <label
                      key={post.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--color-surface)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelection(post.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-[var(--color-text-tertiary)] min-w-[80px]">
                        {label}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)] truncate flex-1">
                        {post.caption?.slice(0, 80) ?? "(sem legenda)"}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {post.platforms.join(", ")}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--module-accent)]" />
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
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const dayPosts = postsByDate.get(dateKey) ?? [];

                return (
                  <CalendarDayCell
                    key={index}
                    date={date}
                    posts={dayPosts}
                    isToday={isToday(date)}
                    isCurrentMonth={isCurrentMonthDay(date)}
                    onPostClick={(post) => setSelectedPost(post)}
                    onEmptyClick={(d) => handleCreatePost(d)}
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
              onEmptyClick={(d) => handleCreatePost(d)}
              onDropPost={handleDropPost}
              onDragStart={setDraggedPostId}
            />
          </div>
        ) : (
          <CalendarAgendaView
            posts={filteredPosts}
            onPostClick={(post) => setSelectedPost(post)}
            onCreatePost={handleCreatePost}
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
            thumbnailUrl: selectedPost.thumbnailUrl,
            thumbnailType: null,
          }}
          companyId={companyId}
          onClose={() => setSelectedPost(null)}
          onRefresh={() => {
            fetchPosts();
            setSelectedPost(null);
          }}
        />
      )}
    </Card>
  );
}
