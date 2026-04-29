"use client";

import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  FolderOpen,
  GalleryHorizontal,
  Image as ImageIcon,
  Loader2,
  TrendingDown,
  TrendingUp,
  Upload,
  Video,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildUploadMediaFiles,
  formatCardDate,
  formatRelativeDate,
  IMAGE_TYPES,
  inferPostTypeFromFiles,
  inferPostTypeFromLibraryItems,
  isCurrentMonth,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  normalizeProgress,
  normalizeStringMap,
  postTypeLabel,
  validateClientMedia,
  type MediaFile,
} from "@/lib/social/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandStage } from "./command-stage";
import { CreatePostDrawer } from "./create-post-drawer";
import { MediaLibraryPicker } from "./media-library-picker";
import { PostDetailsModal } from "./post-details-modal";
import { PlatformIcon, PLATFORM_LABELS } from "./platform-icons";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";
import type {
  SocialPostType,
  SocialPublishStatus,
  ScheduledHistoryItem,
  HistoryResponse,
  ConnectedPlatform,
  ApiErrorPayload,
} from "@/types/modules/social-publisher.types";
import { STATUS_COLORS, STATUS_LABELS } from "@/types/modules/social-publisher.types";

type SocialPublisherDashboardProps = {
  companyId: string;
  initialHistory: HistoryResponse;
  companyTimezone: string;
};

const POST_TYPE_META: Record<
  SocialPostType,
  { label: string; icon: typeof ImageIcon; helper: string }
> = {
  photo: {
    label: "Foto",
    icon: ImageIcon,
    helper: "Imagem única para publicação rápida.",
  },
  video: {
    label: "Vídeo",
    icon: Video,
    helper: "Clipe pronto para feed ou reels curtos.",
  },
  carousel: {
    label: "Carrossel",
    icon: GalleryHorizontal,
    helper: "Sequência de imagens com narrativa em etapas.",
  },
};

function getThumbnailFallback(item: ScheduledHistoryItem) {
  if (item.postType === "video") {
    return <Video className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
  }

  if (item.postType === "carousel") {
    return <GalleryHorizontal className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
  }

  return <ImageIcon className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
}

function getPlatformProgressPercent(item: ScheduledHistoryItem) {
  const total = item.platforms.length;
  if (total === 0) return 0;
  let done = 0;
  for (const platform of item.platforms) {
    if (item.progress[platform]?.status === "ok") {
      done += 1;
    }
  }
  return Math.round((done / total) * 100);
}

function formatShortRelative(value: string) {
  const target = new Date(value).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / 86_400_000);

  if (absMs < 60_000) return diffMs >= 0 ? "agora" : "agora";
  if (minutes < 60) return diffMs >= 0 ? `em ${minutes}min` : `há ${minutes}min`;
  if (hours < 24) return diffMs >= 0 ? `em ${hours}h` : `há ${hours}h`;
  if (days < 7) return diffMs >= 0 ? `em ${days}d` : `há ${days}d`;

  const date = new Date(value);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SocialPublisherDashboard({
  companyId,
  initialHistory,
  companyTimezone,
}: SocialPublisherDashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [history, setHistory] = useState<ScheduledHistoryItem[]>(initialHistory.items);
  const [total, setTotal] = useState(initialHistory.total);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPostType, setDrawerPostType] = useState<SocialPostType>("photo");
  const [drawerMediaFiles, setDrawerMediaFiles] = useState<MediaFile[]>([]);
  const [details, setDetails] = useState<ScheduledHistoryItem | null>(null);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const refreshHistory = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRefreshingHistory(true);

    try {
      const params = new URLSearchParams({
        companyId,
        page: "1",
      });

      const response = await fetch(`/api/social/schedule?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as ApiErrorPayload & HistoryResponse;

      if (!response.ok) {
        setError(payload.error ?? "Falha ao atualizar histórico.");
        return;
      }

      setHistory(payload.items);
      setTotal(payload.total);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(err instanceof Error ? err.message : "Falha ao atualizar histórico.");
    } finally {
      setIsRefreshingHistory(false);
    }
  }, [companyId]);

  const handleOpenDrawer = useCallback((postType: SocialPostType, mediaFiles: MediaFile[] = []) => {
    setError(null);
    setDrawerPostType(postType);
    setDrawerMediaFiles(mediaFiles);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerMediaFiles([]);
  }, []);

  const openUploadPicker = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSelection = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);
    const postType = inferPostTypeFromFiles(files);

    if (!postType) {
      setError("Use uma imagem, um vídeo ou entre 2 e 10 imagens para carrossel.");
      return;
    }

    for (const file of files) {
      const maxSize = file.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const maxMB = (maxSize / 1024 / 1024).toFixed(0);
        setError(
          `${file.name} é muito grande (${sizeMB}MB). Limite de ${maxMB}MB para ${
            file.type.startsWith("video/") ? "vídeos" : "imagens"
          }.`
        );
        return;
      }
    }

    const nextMediaFiles = buildUploadMediaFiles(files);
    const mediaError = validateClientMedia(postType, nextMediaFiles);
    if (mediaError) {
      nextMediaFiles.forEach((mediaFile) => {
        URL.revokeObjectURL(mediaFile.previewUrl);
      });
      setError(mediaError);
      return;
    }

    handleOpenDrawer(postType, nextMediaFiles);
  }, [handleOpenDrawer]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleUploadSelection(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleUploadSelection(event.dataTransfer.files);
  };

  const handleLibrarySelect = (items: MediaLibraryItem[]) => {
    const postType = inferPostTypeFromLibraryItems(items);
    if (!postType) {
      setError("Selecione uma mídia única ou um conjunto de imagens para carrossel.");
      return;
    }

    const nextMediaFiles: MediaFile[] = items.map((item) => ({
      id: `library-${item.id}`,
      file: new File([], item.fileName, { type: item.fileType }),
      previewUrl: item.publicUrl,
      source: "library",
      libraryItemId: item.id,
    }));

    const mediaError = validateClientMedia(postType, nextMediaFiles);
    if (mediaError) {
      setError(mediaError);
      return;
    }

    handleOpenDrawer(postType, nextMediaFiles);
  };

  useEffect(() => {
    const fetchConnectedPlatforms = async () => {
      try {
        const params = new URLSearchParams({ companyId });
        const response = await fetch(`/api/social/connected-platforms?${params.toString()}`);
        const payload = (await response.json()) as {
          connected?: ConnectedPlatform[];
        } & ApiErrorPayload;

        if (!response.ok) {
          setError(payload.error ?? "Falha ao carregar plataformas conectadas.");
          return;
        }

        setConnectedPlatforms(payload.connected ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar plataformas conectadas.");
      } finally {
        setIsLoadingPlatforms(false);
      }
    };

    void fetchConnectedPlatforms();
  }, [companyId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`social-progress-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_posts",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (typeof payload.new !== "object" || payload.new === null) {
            return;
          }

          const row = payload.new as Record<string, unknown>;
          const rowId = typeof row.id === "string" ? row.id : null;
          if (!rowId) {
            return;
          }

          startTransition(() => {
            setHistory((previous) => {
              const next = [...previous];
              const index = next.findIndex((item) => item.id === rowId);

              if (index < 0) {
                return previous;
              }

              next[index] = {
                ...next[index],
                status:
                  row.status === "scheduled" ||
                  row.status === "processing" ||
                  row.status === "published" ||
                  row.status === "partial" ||
                  row.status === "failed" ||
                  row.status === "cancelled"
                    ? row.status
                    : next[index].status,
                progress: normalizeProgress(row.progress),
                externalPostIds: normalizeStringMap(row.external_post_ids),
                errorDetails: normalizeStringMap(row.error_details),
                publishedAt:
                  typeof row.published_at === "string"
                    ? row.published_at
                    : next[index].publishedAt,
              };

              return next;
            });
          });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [companyId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      drawerMediaFiles.forEach((mediaFile) => {
        if (mediaFile.revokePreviewOnDispose) {
          URL.revokeObjectURL(mediaFile.previewUrl);
        }
      });
    };
  }, [drawerMediaFiles]);

  const metrics = useMemo(() => {
    if (history.length === 0) {
      return {
        totalThisMonth: "—",
        scheduled: "—",
        published: "—",
        successRate: "—",
        deltaPct: null as number | null,
        sparkData: [] as number[],
      };
    }

    const now = new Date();
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthCount = history.filter((item) => isCurrentMonth(item.scheduledAt)).length;
    const lastMonthCount = history.filter((item) => {
      const d = new Date(item.scheduledAt);
      return (
        d.getFullYear() === lastMonthRef.getFullYear() && d.getMonth() === lastMonthRef.getMonth()
      );
    }).length;

    const scheduled = history.filter((item) => item.status === "scheduled").length;
    const published = history.filter((item) => item.status === "published").length;
    const completedAttempts = history.filter(
      (item) =>
        item.status === "published" ||
        item.status === "partial" ||
        item.status === "failed"
    );
    const successfulAttempts = completedAttempts.filter(
      (item) => item.status === "published" || item.status === "partial"
    ).length;

    const deltaPct =
      lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : null;

    const sparkData: number[] = [];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    for (let i = 13; i >= 0; i--) {
      const dayStart = today - i * 86_400_000;
      const dayEnd = dayStart + 86_400_000;
      const count = history.filter((item) => {
        const t = new Date(item.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      sparkData.push(count);
    }

    return {
      totalThisMonth: String(thisMonthCount),
      scheduled: String(scheduled),
      published: String(published),
      successRate:
        completedAttempts.length > 0
          ? `${Math.round((successfulAttempts / completedAttempts.length) * 100)}%`
          : "—",
      deltaPct,
      sparkData,
    };
  }, [history]);

  const upcomingScheduled = useMemo(() => {
    const now = Date.now();
    const scheduled = [...history]
      .filter((item) => item.status === "scheduled")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const futureScheduled = scheduled.filter(
      (item) => new Date(item.scheduledAt).getTime() >= now
    );

    return (futureScheduled.length > 0 ? futureScheduled : scheduled).slice(0, 6);
  }, [history]);

  const recentPosts = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [history]);

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        multiple
        onChange={handleInputChange}
      />

      {/* Command Stage — visão da semana */}
      <CommandStage
        history={history}
        onCreatePost={() => handleOpenDrawer("photo")}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card accent className="flex flex-col transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
          <CardHeader className="pb-4">
            <CardTitle>Criar Post</CardTitle>
            <CardDescription>
              Comece pelo formato ideal e abra o drawer com a mídia certa.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.entries(POST_TYPE_META) as Array<
                [SocialPostType, (typeof POST_TYPE_META)[SocialPostType]]
              >).map(([postType, meta]) => {
                const Icon = meta.icon;

                return (
                  <button
                    key={postType}
                    type="button"
                    onClick={() => handleOpenDrawer(postType)}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--module-color,#8B5CF6)]/50 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-color,#8B5CF6)]"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--module-color-bg,#F5F3FF)] text-[var(--module-color,#8B5CF6)] transition-colors group-hover:bg-[var(--module-color,#8B5CF6)] group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {meta.label}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {meta.helper}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isLoadingPlatforms
                  ? "Carregando plataformas conectadas..."
                  : connectedPlatforms.length > 0
                    ? `${connectedPlatforms.length} plataforma(s) prontas para reutilizar mídia da biblioteca.`
                    : "Biblioteca pronta para reuso, assim que houver plataformas conectadas."}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setError(null);
                  setLibraryPickerOpen(true);
                }}
              >
                <FolderOpen className="h-4 w-4" />
                Selecionar da Biblioteca
              </Button>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={openUploadPicker}
              onDrop={(event) => {
                setIsDraggingOver(false);
                handleDrop(event);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isDraggingOver) setIsDraggingOver(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsDraggingOver(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openUploadPicker();
                }
              }}
              className={`flex min-h-40 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200 ${
                isDraggingOver
                  ? "border-[var(--module-color,#8B5CF6)] bg-[var(--module-color,#8B5CF6)]/[0.08]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--module-color,#8B5CF6)]/60 hover:bg-[var(--module-color,#8B5CF6)]/[0.04]"
              }`}
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--module-color-bg,#F5F3FF)] text-[var(--module-color,#8B5CF6)]">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Arraste mídia ou clique para enviar
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                JPEG, PNG, WEBP, MP4 ou MOV — até 10 imagens para carrossel
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
          <CardHeader className="pb-4">
            <CardTitle>Métricas Rápidas</CardTitle>
            <CardDescription>
              Leitura instantânea do histórico já carregado neste dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid flex-1 gap-3 sm:grid-cols-2">
            {[
              {
                key: "month" as const,
                label: "Posts este mês",
                value: metrics.totalThisMonth,
              },
              { key: "scheduled" as const, label: "Agendados", value: metrics.scheduled },
              { key: "published" as const, label: "Publicados", value: metrics.published },
              {
                key: "successRate" as const,
                label: "Taxa de sucesso",
                value: metrics.successRate,
              },
            ].map((metric) => {
              const showTrend = metric.key === "month" && metrics.deltaPct !== null;
              const showSpark =
                metric.key === "month" && metrics.sparkData.some((n) => n > 0);

              return (
                <div
                  key={metric.label}
                  className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                    {metric.label}
                  </p>
                  <p className="mt-3 font-display text-2xl font-bold tabular-nums text-[var(--color-text)]">
                    {metric.value}
                  </p>
                  {showTrend && metrics.deltaPct !== null ? (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                        metrics.deltaPct > 0
                          ? "text-[var(--color-success)]"
                          : metrics.deltaPct < 0
                            ? "text-[var(--color-danger)]"
                            : "text-[var(--color-text-tertiary)]"
                      }`}
                    >
                      {metrics.deltaPct > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : metrics.deltaPct < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : null}
                      {metrics.deltaPct > 0 ? "+" : ""}
                      {metrics.deltaPct}% vs. mês anterior
                    </p>
                  ) : null}
                  {showSpark ? (
                    <div className="mt-auto h-8 pt-2" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={metrics.sparkData.map((v, i) => ({ v, i }))}
                          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                        >
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke="var(--module-color,#8B5CF6)"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-bg)] px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-[var(--color-text)]">
              Próximos Agendamentos
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Faixa rápida dos próximos conteúdos já programados.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/social-publisher/calendario">
              Ver calendário
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {upcomingScheduled.length > 0 ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {upcomingScheduled.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetails(item)}
                className="group flex min-w-[220px] max-w-[240px] snap-start flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left shadow-card transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover"
              >
                <div className="relative aspect-video bg-[var(--color-surface-2)]">
                  {item.thumbnailUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={item.thumbnailUrl}
                      alt={item.caption ?? postTypeLabel(item.postType)}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {getThumbnailFallback(item)}
                    </div>
                  )}
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)]/90 px-2 py-0.5 text-xs font-medium text-[var(--color-text)] shadow-card backdrop-blur">
                    <Clock className="h-3 w-3 text-[var(--module-color,#8B5CF6)]" />
                    {formatShortRelative(item.scheduledAt)}
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {postTypeLabel(item.postType)}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.platforms.map((platform) => (
                        <PlatformIcon
                          key={`${item.id}-${platform}`}
                          platform={platform}
                          className="h-3.5 w-3.5"
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {formatCardDate(item.scheduledAt)}
                  </p>

                  <p
                    className="text-sm text-[var(--color-text-secondary)]"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.caption?.trim() || "Sem legenda informada."}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card className="transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--module-color-bg,#F5F3FF)] text-[var(--module-color,#8B5CF6)]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">Nenhum post agendado</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Abra o drawer e coloque o próximo conteúdo na fila.
                </p>
              </div>
              <Button type="button" onClick={() => handleOpenDrawer("photo")}>
                <ImageIcon className="h-4 w-4" />
                Criar post
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-display text-xl font-bold text-[var(--color-text)]">
                Publicações Recentes
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Últimos {Math.min(recentPosts.length, 5)} itens visíveis de {total} no histórico.
              </p>
            </div>
            {isRefreshingHistory ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--module-color,#8B5CF6)]" />
            ) : null}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/social-publisher/historico">
              Ver histórico
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card className="transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
          <CardContent className="p-0">
            {recentPosts.length > 0 ? (
              <div className="divide-y divide-[var(--color-border)]">
                {recentPosts.map((item) => {
                  const isInFlight = item.status === "scheduled" || item.status === "processing";
                  const progressPct = getPlatformProgressPercent(item);
                  const showProgress = isInFlight && progressPct > 0 && progressPct < 100;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDetails(item)}
                      className="relative grid w-full grid-cols-[auto,1fr,auto] gap-4 px-5 py-4 text-left transition-all duration-200 hover:bg-[var(--color-surface-2)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                        {item.thumbnailUrl ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={item.thumbnailUrl}
                            alt={item.caption ?? postTypeLabel(item.postType)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getThumbnailFallback(item)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-text)]">
                            {postTypeLabel(item.postType)}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.platforms.map((platform) => (
                              <span
                                key={`${item.id}-${platform}`}
                                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
                              >
                                <PlatformIcon platform={platform} className="h-3 w-3" />
                                {PLATFORM_LABELS[platform]}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                          {item.caption?.trim() || "Sem legenda informada."}
                        </p>
                      </div>

                      <div className="flex min-w-[120px] flex-col items-end gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[item.status]}`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {formatRelativeDate(item.publishedAt ?? item.scheduledAt)}
                        </span>
                      </div>

                      {showProgress ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--color-surface-2)]"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-r-full bg-[var(--module-color,#8B5CF6)] transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">
                Nenhuma publicação ainda
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <CreatePostDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        companyId={companyId}
        companyTimezone={companyTimezone}
        initialPostType={drawerPostType}
        initialMediaFiles={drawerMediaFiles}
        onSuccess={refreshHistory}
      />

      <MediaLibraryPicker
        companyId={companyId}
        mode="multi"
        maxSelection={10}
        open={libraryPickerOpen}
        onClose={() => setLibraryPickerOpen(false)}
        onSelect={handleLibrarySelect}
      />

      <PostDetailsModal
        details={details}
        companyId={companyId}
        onClose={() => setDetails(null)}
        onRefresh={refreshHistory}
      />
    </div>
  );
}
