/**
 * Arquivo: src/components/social/best-times-widget.tsx
 * Propósito: Widget com heatmap e top 3 horários recomendados para postar.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BestTimesHeatmap } from "./best-times-heatmap";
import type { BestTimeSlot, SocialPlatform } from "@/types/modules/social-publisher.types";

type BestTimesWidgetProps = {
  companyId: string;
};

type TabKey = "all" | SocialPlatform;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "instagram", label: "IG" },
  { key: "linkedin", label: "LI" },
  { key: "tiktok", label: "TT" },
  { key: "facebook", label: "FB" },
];

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function BestTimesWidget({ companyId }: BestTimesWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [slots, setSlots] = useState<BestTimeSlot[]>([]);
  const [totalPublished, setTotalPublished] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (platform: TabKey) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ companyId });
      if (platform !== "all") params.set("platform", platform);

      const res = await fetch(`/api/social/best-times?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
        setTotalPublished(data.totalPublished ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const maxCount = slots.length > 0 ? Math.max(...slots.map((s) => s.postCount)) : 0;
  const top3 = slots.slice(0, 3);

  return (
    <Card accent className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--module-accent)]" />
          Melhores Horários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tab bar */}
        <div className="flex gap-1 bg-[var(--color-surface-2)] rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-[10px] font-medium py-1.5 rounded-md transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--color-surface)] text-[var(--module-accent)] shadow-sm"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-xs text-[var(--color-text-tertiary)]">
            Analisando...
          </div>
        ) : totalPublished === 0 ? (
          <div className="py-4 text-center text-xs text-[var(--color-text-tertiary)]">
            Publique posts para ver estatísticas
          </div>
        ) : (
          <>
            {/* Heatmap */}
            <BestTimesHeatmap slots={slots} maxCount={maxCount} />

            {/* Top 3 */}
            {top3.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide font-medium">
                  Top horários
                </p>
                {top3.map((slot, i) => (
                  <div
                    key={`${slot.dayOfWeek}-${slot.hour}`}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-[var(--module-accent)] font-bold w-4">{i + 1}.</span>
                    <Clock className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                    <span className="text-[var(--color-text)] font-medium">
                      {DAYS[slot.dayOfWeek]} {slot.hour}h
                    </span>
                    <span className="text-[var(--color-text-tertiary)]">
                      ({slot.postCount} posts)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <p className="text-[10px] text-[var(--color-text-tertiary)] text-center pt-1 border-t border-[var(--color-border)]">
              Baseado em {totalPublished} post{totalPublished !== 1 ? "s" : ""} publicado{totalPublished !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
