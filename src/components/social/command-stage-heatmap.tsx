/**
 * Arquivo: src/components/social/command-stage-heatmap.tsx
 * Propósito: Heat Map 7×24 do Command Stage — mostra a semana em densidade visual.
 *            Violeta = publicado, Laranja = agendado, Vazio = transparente.
 */

"use client";

import { Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS_DISPLAY = [6, 9, 12, 15, 18, 21]; // Mostrar apenas labels chave

export type HeatMapCell = {
  dayOfWeek: number; // 0-6 (Dom-Sáb)
  hour: number; // 0-23
  status: "published" | "scheduled" | "empty";
  postId?: string;
  postTitle?: string;
  platform?: string;
};

type HeatMapProps = {
  cells: HeatMapCell[];
  onCellClick?: (cell: HeatMapCell) => void;
};

function getCellColor(status: HeatMapCell["status"]) {
  switch (status) {
    case "published":
      return "bg-[#8B5CF6]/70 hover:bg-[#8B5CF6] dark:bg-[#8B5CF6]/60 dark:hover:bg-[#8B5CF6]/80";
    case "scheduled":
      return "bg-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/70 dark:bg-[var(--color-primary)]/40 dark:hover:bg-[var(--color-primary)]/60";
    default:
      return "bg-[var(--color-border)]/50 hover:bg-[var(--color-border)] dark:bg-[var(--color-surface-3)]/40 dark:hover:bg-[var(--color-surface-3)]/60";
  }
}

export function CommandStageHeatMap({ cells, onCellClick }: HeatMapProps) {
  const [tooltip, setTooltip] = useState<{
    cell: HeatMapCell;
    x: number;
    y: number;
  } | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, HeatMapCell>();
    for (const cell of cells) {
      map.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
    }
    return map;
  }, [cells]);

  // Apenas horas 6-23 (horário útil)
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = 6; i <= 23; i++) h.push(i);
    return h;
  }, []);

  return (
    <div className="relative">
      {/* Header dos dias */}
      <div className="mb-1 grid grid-cols-[40px_repeat(7,1fr)] gap-[2px]">
        <div /> {/* spacer para alinhar com labels de hora */}
        {DAYS.map((day, i) => {
          const isToday = new Date().getDay() === i;
          return (
            <div
              key={day}
              className={cn(
                "text-center text-[10px] font-medium uppercase tracking-wider",
                isToday
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-tertiary)]"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Grid de células */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-[2px]">
        {hours.map((hour) => (
          <Fragment key={`row-${hour}`}>
            {/* Label da hora */}
            <div
              className="flex items-center justify-end pr-2 text-[9px] tabular-nums text-[var(--color-text-tertiary)]"
            >
              {HOURS_DISPLAY.includes(hour) ? `${hour}h` : ""}
            </div>

            {/* 7 células por hora */}
            {DAYS.map((_, dayIndex) => {
              const key = `${dayIndex}-${hour}`;
              const cell = cellMap.get(key) ?? {
                dayOfWeek: dayIndex,
                hour,
                status: "empty" as const,
              };

              return (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "h-[14px] rounded-[2px] transition-all duration-150 cursor-pointer",
                    getCellColor(cell.status)
                  )}
                  onClick={() => onCellClick?.(cell)}
                  onMouseEnter={(e) => {
                    if (cell.status !== "empty") {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        cell,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  aria-label={`${DAYS[dayIndex]} ${hour}h — ${cell.status === "empty" ? "vazio" : cell.status}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--color-text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#8B5CF6]/60" />
          Publicado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[var(--color-primary)]/40" />
          Agendado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[var(--color-surface-3)]/40" />
          Vazio
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-xs font-medium text-[var(--color-text)]">
            {DAYS[tooltip.cell.dayOfWeek]} {tooltip.cell.hour}h
          </p>
          {tooltip.cell.postTitle && (
            <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-[var(--color-text-secondary)]">
              {tooltip.cell.postTitle}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
            {tooltip.cell.status === "published" ? "Publicado" : "Agendado"}
            {tooltip.cell.platform ? ` · ${tooltip.cell.platform}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
