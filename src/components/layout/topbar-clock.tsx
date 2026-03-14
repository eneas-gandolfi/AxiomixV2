"use client";

import { useEffect, useState } from "react";

function formatDateTime(date: Date): { date: string; time: string } {
  const dateStr = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const timeStr = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date: dateFormatted, time: timeStr };
}

export function TopbarClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return <div className="h-4 w-48 rounded" aria-hidden="true" />;
  }

  const { date, time } = formatDateTime(now);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[var(--color-text)]">
        {date}
      </span>
      <span className="rounded bg-[var(--color-hover)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-muted)]">
        {time}
      </span>
    </div>
  );
}
