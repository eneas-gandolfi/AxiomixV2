/**
 * Arquivo: src/components/social/command-stage.tsx
 * Propósito: Command Stage — palco de entrada do Social Publisher.
 *            Heat map da semana + spotlight do próximo post + métricas rápidas.
 *            A primeira coisa que o usuário vê ao entrar no módulo.
 */

"use client";

import { useMemo } from "react";
import { BarChart3, Eye, TrendingUp } from "lucide-react";
import {
  CommandStageHeatMap,
  type HeatMapCell,
} from "./command-stage-heatmap";
import {
  NextPostSpotlight,
  type SpotlightPost,
} from "./command-stage-spotlight";
import type { ScheduledHistoryItem, SocialPlatform } from "@/types/modules/social-publisher.types";

type CommandStageProps = {
  history: ScheduledHistoryItem[];
  onCreatePost: () => void;
  onPublishNow?: (postId: string) => void;
};

function buildHeatMapCells(history: ScheduledHistoryItem[]): HeatMapCell[] {
  const cells: HeatMapCell[] = [];

  for (const item of history) {
    const date = new Date(item.scheduledAt);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    cells.push({
      dayOfWeek,
      hour,
      status:
        item.status === "published"
          ? "published"
          : item.status === "scheduled"
            ? "scheduled"
            : "empty",
      postId: item.id,
      postTitle: item.caption?.slice(0, 60),
      platform: item.platforms[0],
    });
  }

  return cells;
}

function findNextPost(
  history: ScheduledHistoryItem[]
): SpotlightPost | null {
  const now = Date.now();

  const scheduled = history
    .filter(
      (item) =>
        item.status === "scheduled" &&
        new Date(item.scheduledAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  const next = scheduled[0];
  if (!next) return null;

  return {
    id: next.id,
    scheduledAt: next.scheduledAt,
    platform: (next.platforms[0] ?? "instagram") as SocialPlatform,
    postType: next.postType as SpotlightPost["postType"],
    contentPreview: next.caption?.slice(0, 200) ?? "",
    thumbnailUrl: next.thumbnailUrl ?? undefined,
  };
}

export function CommandStage({
  history,
  onCreatePost,
  onPublishNow,
}: CommandStageProps) {
  const heatMapCells = useMemo(() => buildHeatMapCells(history), [history]);
  const nextPost = useMemo(() => findNextPost(history), [history]);

  const metrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

    const thisWeek = history.filter(
      (item) => new Date(item.scheduledAt) >= weekAgo
    );
    const published = thisWeek.filter((item) => item.status === "published");
    const scheduled = thisWeek.filter((item) => item.status === "scheduled");

    return {
      postsThisWeek: thisWeek.length,
      publishedThisWeek: published.length,
      scheduledPending: scheduled.length,
    };
  }, [history]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all duration-200 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="ax-t2">Visão da semana</h2>
          <p className="mt-0.5 ax-caption">
            {metrics.postsThisWeek === 0
              ? "Nenhum post esta semana — comece criando"
              : `${metrics.postsThisWeek} post${metrics.postsThisWeek === 1 ? "" : "s"} · ${metrics.publishedThisWeek} publicado${metrics.publishedThisWeek === 1 ? "" : "s"} · ${metrics.scheduledPending} agendado${metrics.scheduledPending === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Grid principal: Heat Map (60%) + Spotlight (40%) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        {/* Heat Map */}
        <div className="min-w-0">
          <CommandStageHeatMap
            cells={heatMapCells}
            onCellClick={(cell) => {
              if (cell.status === "empty") {
                onCreatePost();
              }
            }}
          />
        </div>

        {/* Next Post Spotlight */}
        <NextPostSpotlight
          post={nextPost}
          onCreatePost={onCreatePost}
          onPublishNow={onPublishNow}
        />
      </div>

      {/* Metrics Strip */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          {
            icon: BarChart3,
            label: "Posts esta semana",
            value: metrics.postsThisWeek,
          },
          {
            icon: Eye,
            label: "Publicados",
            value: metrics.publishedThisWeek,
          },
          {
            icon: TrendingUp,
            label: "Agendados",
            value: metrics.scheduledPending,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-2)] px-4 py-3"
          >
            <metric.icon className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {metric.label}
              </p>
              <p className="text-lg font-bold tabular-nums text-[var(--color-text)]">
                {metric.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
