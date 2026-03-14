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
  FolderOpen,
  GalleryHorizontal,
  Image as ImageIcon,
  Loader2,
  Upload,
  Video,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePostDrawer } from "./create-post-drawer";
import { MediaLibraryPicker } from "./media-library-picker";
import { PostDetailsModal } from "./post-details-modal";
import { PlatformIcon, PLATFORM_LABELS } from "./platform-icons";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";
import type {
  PublishErrorMap,
  PublishProgressMap,
  PublishResultMap,
  SocialPlatform,
  SocialPostType,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

type ScheduledHistoryItem = {
  id: string;
  postType: SocialPostType;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: SocialPublishStatus;
  progress: PublishProgressMap;
  externalPostIds: PublishResultMap;
  errorDetails: PublishErrorMap;
  publishedAt: string | null;
  createdAt: string;
  qstashMessageId: string | null;
  mediaFileIds: string[];
  thumbnailUrl: string | null;
  thumbnailType: string | null;
};

type HistoryResponse = {
  items: ScheduledHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ConnectedPlatform = {
  platform: SocialPlatform;
  accountName: string | null;
};

type ApiErrorPayload = {
  error?: string;
};

type MediaFile = {
  id: string;
  file: File;
  previewUrl: string;
  source: "upload" | "library";
  libraryItemId?: string;
  revokePreviewOnDispose?: boolean;
};

type SocialPublisherDashboardProps = {
  companyId: string;
  initialHistory: HistoryResponse;
};

const STATUS_COLORS: Record<SocialPublishStatus, string> = {
  scheduled: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  processing: "bg-[var(--color-primary-dim)] text-[#FA5E24]",
  published: "bg-[var(--color-success-bg)] text-[#22C55E]",
  partial: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  failed: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  cancelled: "bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]",
};

const STATUS_LABELS: Record<SocialPublishStatus, string> = {
  scheduled: "Agendado",
  processing: "Processando",
  published: "Publicado",
  partial: "Parcial",
  failed: "Falhou",
  cancelled: "Cancelado",
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

function postTypeLabel(postType: SocialPostType) {
  return POST_TYPE_META[postType].label;
}

function normalizeStringMap(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

function normalizeProgress(raw: unknown): PublishProgressMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const result: PublishProgressMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key !== "instagram" && key !== "linkedin" && key !== "tiktok" && key !== "facebook") {
      continue;
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }

    const item = value as Record<string, unknown>;
    const status = item.status;
    if (
      status !== "pending" &&
      status !== "processing" &&
      status !== "ok" &&
      status !== "error"
    ) {
      continue;
    }

    result[key as SocialPlatform] = {
      status,
      externalPostId: typeof item.externalPostId === "string" ? item.externalPostId : undefined,
      error: typeof item.error === "string" ? item.error : undefined,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
    };
  }

  return result;
}

function validateClientMedia(postType: SocialPostType, files: MediaFile[]) {
  if (postType === "photo") {
    if (files.length !== 1) {
      return "Foto exige exatamente 1 imagem.";
    }
    if (!IMAGE_TYPES.has(files[0].file.type)) {
      return "Foto aceita jpg, png ou webp.";
    }
    return null;
  }

  if (postType === "video") {
    if (files.length !== 1) {
      return "Vídeo exige exatamente 1 arquivo.";
    }
    if (!VIDEO_TYPES.has(files[0].file.type)) {
      return "Vídeo aceita mp4 ou mov.";
    }
    return null;
  }

  if (files.length < 2 || files.length > 10) {
    return "Carrossel exige entre 2 e 10 imagens.";
  }
  if (files.some((mediaFile) => !IMAGE_TYPES.has(mediaFile.file.type))) {
    return "Carrossel aceita apenas jpg, png ou webp.";
  }

  return null;
}

function inferPostTypeFromFiles(files: File[]): SocialPostType | null {
  if (files.length === 0) {
    return null;
  }

  if (files.length === 1) {
    const [file] = files;
    if (IMAGE_TYPES.has(file.type)) {
      return "photo";
    }
    if (VIDEO_TYPES.has(file.type)) {
      return "video";
    }
    return null;
  }

  return files.every((file) => IMAGE_TYPES.has(file.type)) ? "carousel" : null;
}

function inferPostTypeFromLibraryItems(items: MediaLibraryItem[]): SocialPostType | null {
  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    const [item] = items;
    if (IMAGE_TYPES.has(item.fileType)) {
      return "photo";
    }
    if (VIDEO_TYPES.has(item.fileType)) {
      return "video";
    }
    return null;
  }

  return items.every((item) => IMAGE_TYPES.has(item.fileType)) ? "carousel" : null;
}

function formatCardDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const target = new Date(value);
  const diff = target.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absDiff < minute) {
    return "agora";
  }
  if (absDiff < hour) {
    return rtf.format(Math.round(diff / minute), "minute");
  }
  if (absDiff < day) {
    return rtf.format(Math.round(diff / hour), "hour");
  }
  if (absDiff < month) {
    return rtf.format(Math.round(diff / day), "day");
  }
  if (absDiff < year) {
    return rtf.format(Math.round(diff / month), "month");
  }

  return rtf.format(Math.round(diff / year), "year");
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function buildUploadMediaFiles(files: File[]) {
  return files.map((file) => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    source: "upload" as const,
    revokePreviewOnDispose: true,
  }));
}

function getThumbnailFallback(item: ScheduledHistoryItem) {
  if (item.postType === "video") {
    return <Video className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
  }

  if (item.postType === "carousel") {
    return <GalleryHorizontal className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
  }

  return <ImageIcon className="h-5 w-5 text-[var(--color-text-tertiary)]" />;
}

export function SocialPublisherDashboard({
  companyId,
  initialHistory,
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
        const response = await fetch("/api/social/connected-platforms");
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
  }, []);

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
      };
    }

    const totalThisMonth = history.filter((item) => isCurrentMonth(item.scheduledAt)).length;
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

    return {
      totalThisMonth: String(totalThisMonth),
      scheduled: String(scheduled),
      published: String(published),
      successRate:
        completedAttempts.length > 0
          ? `${Math.round((successfulAttempts / completedAttempts.length) * 100)}%`
          : "—",
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card accent className="transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
          <CardHeader className="pb-4">
            <CardTitle>Criar Post</CardTitle>
            <CardDescription>
              Comece pelo formato ideal e abra o drawer com a mídia certa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(POST_TYPE_META) as Array<
                [SocialPostType, (typeof POST_TYPE_META)[SocialPostType]]
              >).map(([postType, meta]) => {
                const Icon = meta.icon;

                return (
                  <button
                    key={postType}
                    type="button"
                    onClick={() => handleOpenDrawer(postType)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-card-hover"
                  >
                    <Icon className="h-4 w-4 text-[#FA5E24]" />
                    {meta.label}
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
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openUploadPicker();
                }
              }}
              className="flex min-h-24 max-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-center transition-all duration-200 hover:border-[#FA5E24]/60 hover:bg-[#FA5E24]/[0.04]"
            >
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-[#FA5E24]">
                <Upload className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Arraste mídia ou clique
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                JPEG, PNG, WEBP, MP4 ou MOV
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover">
          <CardHeader className="pb-4">
            <CardTitle>Métricas Rápidas</CardTitle>
            <CardDescription>
              Leitura instantânea do histórico já carregado neste dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Posts este mês", value: metrics.totalThisMonth },
              { label: "Agendados", value: metrics.scheduled },
              { label: "Publicados", value: metrics.published },
              { label: "Taxa de sucesso", value: metrics.successRate },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  {metric.label}
                </p>
                <p className="mt-3 font-display text-2xl font-bold text-[var(--color-text)]">
                  {metric.value}
                </p>
              </div>
            ))}
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
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1">
            {upcomingScheduled.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetails(item)}
                className="group flex min-w-[200px] max-w-[200px] snap-start flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left shadow-card transition-all duration-200 hover:border-[var(--color-border-strong)] hover:shadow-card-hover"
              >
                <div className="aspect-video bg-[var(--color-surface-2)]">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.caption ?? postTypeLabel(item.postType)}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {getThumbnailFallback(item)}
                    </div>
                  )}
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
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-[#FA5E24]">
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
              <Loader2 className="h-4 w-4 animate-spin text-[#FA5E24]" />
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
                {recentPosts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDetails(item)}
                    className="grid w-full grid-cols-[auto,1fr,auto] gap-4 px-5 py-4 text-left transition-all duration-200 hover:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                      {item.thumbnailUrl ? (
                        <img
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
                  </button>
                ))}
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

      <PostDetailsModal details={details} onClose={() => setDetails(null)} />
    </div>
  );
}
