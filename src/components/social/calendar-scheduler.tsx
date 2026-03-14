/**
 * Arquivo: src/components/social/calendar-scheduler.tsx
 * Propósito: Calendário visual + Time picker para agendamento intuitivo
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, Globe, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon, PLATFORM_LABELS } from "./platform-icons";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";

type CalendarSchedulerProps = {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  scheduledPosts?: Date[];
  selectedPlatforms?: SocialPlatform[];
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const QUICK_TIMES = [
  { label: "9h", hour: 9, minute: 0 },
  { label: "12h", hour: 12, minute: 0 },
  { label: "15h", hour: 15, minute: 0 },
  { label: "18h", hour: 18, minute: 0 },
  { label: "21h", hour: 21, minute: 0 },
];

const PLATFORM_BEST_TIMES: Record<SocialPlatform, { ranges: { start: number; end: number }[] }> = {
  instagram: { ranges: [{ start: 11, end: 13 }, { start: 18, end: 20 }] },
  linkedin: { ranges: [{ start: 8, end: 10 }, { start: 17, end: 18 }] },
  tiktok: { ranges: [{ start: 19, end: 22 }] },
  facebook: { ranges: [{ start: 13, end: 16 }] },
};

const FRIENDLY_TZ_NAMES: Record<string, string> = {
  "America/Sao_Paulo": "Brasília",
  "America/Fortaleza": "Fortaleza",
  "America/Manaus": "Manaus",
  "America/Belem": "Belém",
  "America/Cuiaba": "Cuiabá",
  "America/Recife": "Recife",
  "America/Bahia": "Bahia",
  "America/Porto_Velho": "Porto Velho",
  "America/Rio_Branco": "Rio Branco",
  "America/Noronha": "Fernando de Noronha",
  "America/Campo_Grande": "Campo Grande",
};

export function CalendarScheduler({
  selectedDate,
  onDateChange,
  scheduledPosts = [],
  selectedPlatforms = [],
}: CalendarSchedulerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const timezoneInfo = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const sign = offset <= 0 ? "+" : "-";
    const label = FRIENDLY_TZ_NAMES[tz] || tz.split("/").pop()?.replace(/_/g, " ") || tz;
    return `${label} (GMT${sign}${hours})`;
  }, []);

  const recommendedHours = useMemo(() => {
    if (selectedPlatforms.length === 0) return new Set<number>();
    const hours = new Set<number>();
    for (const p of selectedPlatforms) {
      const bestTimes = PLATFORM_BEST_TIMES[p];
      if (!bestTimes) continue;
      for (const range of bestTimes.ranges) {
        for (let h = range.start; h <= range.end; h++) {
          hours.add(h);
        }
      }
    }
    return hours;
  }, [selectedPlatforms]);

  const postCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of scheduledPosts) {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [scheduledPosts]);

  // Gerar dias do calendário
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const anchor = selectedDate || new Date();
    const dayOfWeek = anchor.getDay();
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const getPostCount = (date: Date | null) => {
    if (!date) return 0;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return postCountByDay.get(key) ?? 0;
  };

  const isSelectedDay = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSelectDay = (date: Date | null) => {
    if (!date || isPast(date)) return;

    const newDate = new Date(date);
    newDate.setHours(selectedHour, selectedMinute, 0, 0);

    const now = new Date();
    if (newDate < now) {
      const nextHour = now.getHours() + 1;
      newDate.setHours(nextHour >= 24 ? 23 : nextHour, 0, 0, 0);
    }

    onDateChange(newDate);
  };

  const handleQuickTime = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, minute, 0, 0);
      onDateChange(newDate);
    }
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, selectedMinute, 0, 0);
      onDateChange(newDate);
    }
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(selectedHour, minute, 0, 0);
      onDateChange(newDate);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendário */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-text">
                <Calendar className="h-4 w-4 text-primary" />
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* View toggle */}
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === "month"
                  ? "bg-[#FA5E24] text-white"
                  : "bg-background text-muted hover:bg-sidebar"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-[#FA5E24] text-white"
                  : "bg-background text-muted hover:bg-sidebar"
              }`}
            >
              Semana
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "month" ? (
            <>
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  const isSelected = isSelectedDay(date);
                  const isTodayDay = isToday(date);
                  const isPastDay = isPast(date);
                  const count = getPostCount(date);

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={!date || isPastDay}
                      onClick={() => handleSelectDay(date)}
                      className={`
                        relative aspect-square rounded-lg text-sm font-medium transition-all
                        ${!date ? "invisible" : ""}
                        ${isPastDay ? "text-muted-light cursor-not-allowed" : ""}
                        ${
                          isSelected
                            ? "bg-primary text-white shadow-lg scale-105"
                            : isTodayDay
                            ? "bg-primary-light text-primary border-2 border-primary"
                            : "bg-background text-text hover:bg-sidebar hover:scale-105"
                        }
                        ${!date || isPastDay ? "" : "cursor-pointer"}
                      `}
                    >
                      {date?.getDate()}
                      {count > 0 && !isSelected && (
                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded bg-primary-light border border-primary" />
                  <span>Hoje</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="min-w-[14px] h-[14px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    3
                  </div>
                  <span>Posts agendados</span>
                </div>
              </div>
            </>
          ) : (
            /* Visão Semanal */
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((date, index) => {
                  const isSelected = isSelectedDay(date);
                  const isTodayDay = isToday(date);
                  const isPastDay = isPast(date);
                  const count = getPostCount(date);

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isPastDay}
                      onClick={() => handleSelectDay(date)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isSelected
                          ? "bg-primary text-white shadow-lg"
                          : isTodayDay
                          ? "bg-primary-light text-primary border-2 border-primary"
                          : isPastDay
                          ? "text-muted-light cursor-not-allowed"
                          : "bg-background text-text hover:bg-sidebar"
                      } ${!isPastDay ? "cursor-pointer" : ""}`}
                    >
                      <span className="text-[10px] font-medium uppercase">
                        {WEEKDAYS[date.getDay()]}
                      </span>
                      <span className="text-lg font-semibold">
                        {date.getDate()}
                      </span>
                      {count > 0 && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                          ))}
                          {count > 4 && (
                            <span className={`text-[9px] font-bold ${isSelected ? "text-white" : "text-primary"}`}>+</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Picker */}
      <Card className="border border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-text">
            <Clock className="h-4 w-4 text-primary" />
            Horário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Horários Rápidos */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">
              Horários Populares
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIMES.map((time) => {
                const isRecommended = recommendedHours.has(time.hour);
                return (
                  <Button
                    key={time.label}
                    type="button"
                    size="sm"
                    variant={
                      selectedHour === time.hour && selectedMinute === time.minute
                        ? "default"
                        : "secondary"
                    }
                    onClick={() => handleQuickTime(time.hour, time.minute)}
                    className={isRecommended && selectedHour !== time.hour ? "ring-2 ring-[#FA5E24]/40" : ""}
                  >
                    {time.label}
                    {isRecommended && (
                      <TrendingUp className="h-3 w-3 ml-0.5" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Melhores Horários por Plataforma */}
          {selectedPlatforms.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted mb-2 block flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" />
                Melhores Horários
              </label>
              <div className="space-y-2">
                {selectedPlatforms.map((platform) => {
                  const bestTimes = PLATFORM_BEST_TIMES[platform];
                  if (!bestTimes) return null;
                  return (
                    <div key={platform} className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-[90px]">
                        <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium text-text">{PLATFORM_LABELS[platform]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {bestTimes.ranges.map((range, idx) => (
                          <div key={idx} className="flex gap-0.5">
                            {Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i).map((hour) => (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => handleQuickTime(hour, 0)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  selectedHour === hour
                                    ? "bg-primary text-white"
                                    : "bg-primary-light text-primary hover:bg-primary/20"
                                }`}
                              >
                                {hour}h
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seletor Manual */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Hora</label>
              <select
                value={selectedHour}
                onChange={(e) => handleHourChange(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}h
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Minuto</label>
              <select
                value={selectedMinute}
                onChange={(e) => handleMinuteChange(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <option key={minute} value={minute}>
                    {minute.toString().padStart(2, "0")}min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview do horário selecionado */}
          {selectedDate && (
            <div className="rounded-lg bg-primary-light border border-primary p-3">
              <p className="text-xs font-medium text-primary mb-1">
                Agendado para:
              </p>
              <p className="text-sm font-semibold text-text">
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm font-semibold text-text">
                às {selectedDate.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Fuso: {timezoneInfo}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
