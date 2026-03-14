/**
 * Arquivo: src/components/social/best-times-heatmap.tsx
 * Propósito: Heatmap visual compacto mostrando os melhores horários para postar.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import type { BestTimeSlot } from "@/types/modules/social-publisher.types";

type BestTimesHeatmapProps = {
  slots: BestTimeSlot[];
  maxCount: number;
};

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Show 6 time blocks instead of 24 hours to fit in sidebar */
const TIME_BLOCKS = [
  { label: "0-3", hours: [0, 1, 2, 3] },
  { label: "4-7", hours: [4, 5, 6, 7] },
  { label: "8-11", hours: [8, 9, 10, 11] },
  { label: "12-15", hours: [12, 13, 14, 15] },
  { label: "16-19", hours: [16, 17, 18, 19] },
  { label: "20-23", hours: [20, 21, 22, 23] },
];

function getIntensityColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--color-surface-2)";
  const ratio = count / max;
  if (ratio <= 0.25) return "rgba(250, 94, 36, 0.15)";
  if (ratio <= 0.5) return "rgba(250, 94, 36, 0.35)";
  if (ratio <= 0.75) return "rgba(250, 94, 36, 0.6)";
  return "rgba(250, 94, 36, 0.9)";
}

export function BestTimesHeatmap({ slots, maxCount }: BestTimesHeatmapProps) {
  const slotMap = new Map<string, number>();
  for (const slot of slots) {
    slotMap.set(`${slot.dayOfWeek}-${slot.hour}`, slot.postCount);
  }

  /** Aggregate hours into time blocks */
  function blockCount(dayIndex: number, hours: number[]): number {
    let total = 0;
    for (const h of hours) {
      total += slotMap.get(`${dayIndex}-${h}`) ?? 0;
    }
    return total;
  }

  const maxBlockCount = DAYS.reduce((max, _, dayIndex) => {
    return TIME_BLOCKS.reduce((m, block) => {
      const c = blockCount(dayIndex, block.hours);
      return c > m ? c : m;
    }, max);
  }, 0);

  return (
    <div>
      {/* Time block labels */}
      <div className="flex mb-1">
        <div className="w-5 flex-shrink-0" />
        {TIME_BLOCKS.map((block) => (
          <div
            key={block.label}
            className="flex-1 text-[9px] text-[var(--color-text-tertiary)] text-center leading-tight"
          >
            {block.label}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {DAYS.map((day, dayIndex) => (
        <div key={dayIndex} className="flex items-center gap-[2px] mb-[2px]">
          <div className="w-5 flex-shrink-0 text-[10px] text-[var(--color-text-secondary)] font-medium text-center">
            {day}
          </div>
          {TIME_BLOCKS.map((block) => {
            const count = blockCount(dayIndex, block.hours);
            return (
              <div
                key={block.label}
                className="flex-1 aspect-[1.4] rounded-[3px] transition-colors cursor-default"
                style={{ backgroundColor: getIntensityColor(count, maxBlockCount) }}
                title={`${DAY_NAMES[dayIndex]} ${block.label}h — ${count} post(s)`}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-center">
        <span className="text-[9px] text-[var(--color-text-tertiary)]">Menos</span>
        {[0.15, 0.35, 0.6, 0.9].map((opacity) => (
          <div
            key={opacity}
            className="w-2.5 h-2.5 rounded-[2px]"
            style={{ backgroundColor: `rgba(250, 94, 36, ${opacity})` }}
          />
        ))}
        <span className="text-[9px] text-[var(--color-text-tertiary)]">Mais</span>
      </div>
    </div>
  );
}
