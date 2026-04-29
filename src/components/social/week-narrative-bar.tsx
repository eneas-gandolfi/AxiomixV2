/**
 * Arquivo: src/components/social/week-narrative-bar.tsx
 * Propósito: Barra de densidade semanal — 7 segmentos mostrando volume de posts por dia.
 *            De relance: onde a semana pesa e onde tem vácuo.
 */

"use client";

import { useMemo, useState } from "react";
import type { CalendarPostItem } from "@/types/modules/social-publisher.types";

type WeekNarrativeBarProps = {
  weekStart: Date;
  posts: CalendarPostItem[];
  isToday: (date: Date) => boolean;
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getOpacityForCount(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 0.3;
  if (count <= 4) return 0.6;
  return 1;
}

export function WeekNarrativeBar({
  weekStart,
  posts,
  isToday,
}: WeekNarrativeBarProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const countsByDay = useMemo(() => {
    const counts = new Array(7).fill(0) as number[];
    for (const post of posts) {
      const postDate = new Date(post.scheduledAt);
      for (let i = 0; i < 7; i++) {
        if (
          postDate.getFullYear() === weekDays[i].getFullYear() &&
          postDate.getMonth() === weekDays[i].getMonth() &&
          postDate.getDate() === weekDays[i].getDate()
        ) {
          counts[i]++;
          break;
        }
      }
    }
    return counts;
  }, [posts, weekDays]);

  const totalWeek = countsByDay.reduce((a, b) => a + b, 0);

  return (
    <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="ax-kpi-label !text-[10px]">Distribuição da semana</span>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {totalWeek} post{totalWeek === 1 ? "" : "s"}
        </span>
      </div>

      {/* Barra de 7 segmentos */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, i) => {
          const count = countsByDay[i];
          const opacity = getOpacityForCount(count);
          const today = isToday(date);
          const isHovered = hoveredDay === i;

          return (
            <div
              key={i}
              className="relative cursor-default"
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Barra */}
              <div
                className="h-3 rounded-sm transition-all duration-200"
                style={{
                  backgroundColor:
                    count > 0
                      ? `rgba(139, 92, 246, ${opacity})`
                      : "var(--color-surface-2)",
                  boxShadow:
                    count >= 5 ? "0 0 8px rgba(139, 92, 246, 0.3)" : "none",
                  outline: today
                    ? "2px solid var(--color-primary)"
                    : "none",
                  outlineOffset: "1px",
                }}
              />

              {/* Label do dia */}
              <p
                className={`mt-1 text-center text-[9px] font-medium uppercase ${
                  today
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                {WEEKDAYS_SHORT[date.getDay()]}
              </p>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] shadow-lg">
                  <p className="font-medium text-[var(--color-text)]">
                    {WEEKDAYS_SHORT[date.getDay()]}{" "}
                    {date.getDate()}/{(date.getMonth() + 1).toString().padStart(2, "0")}
                  </p>
                  <p className="text-[var(--color-text-tertiary)]">
                    {count === 0
                      ? "Nenhum post"
                      : `${count} post${count === 1 ? "" : "s"}`}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
