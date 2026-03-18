"use client";

import Link from "next/link";
import {
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
  Calendar,
  CheckCircle2,
  Edit3,
  FolderOpen,
  GalleryHorizontal,
  Image as ImageIcon,
  Loader2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildUploadMediaFiles,
  IMAGE_TYPES,
  inferPostTypeFromFiles,
  inferPostTypeFromLibraryItems,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  postTypeLabel,
  validateClientMedia,
  VIDEO_TYPES,
} from "@/lib/social/utils";
import { Button } from "@/components/ui/button";
import { CalendarScheduler } from "./calendar-scheduler";
import { HashtagGroupPicker } from "./hashtag-group-picker";
import { ImageEditor } from "./image-editor";
import { MediaLibraryPicker } from "./media-library-picker";
import { MockupPreviews } from "./mockup-previews";
import { PlatformIcon, PLATFORM_BRAND_COLORS, PLATFORM_LABELS } from "./platform-icons";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";
import type {
  ApiErrorPayload,
  BestTimeSlot,
  BestTimesData,
  ConnectedPlatform,
  SocialPlatform,
  SocialPostType,
} from "@/types/modules/social-publisher.types";

const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  facebook: 63206,
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const POST_TYPE_OPTIONS: Array<{
  type: SocialPostType;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { type: "photo", label: "Foto", icon: ImageIcon },
  { type: "video", label: "Vídeo", icon: Video },
  { type: "carousel", label: "Carrossel", icon: GalleryHorizontal },
];

type BestTimesPayload = ApiErrorPayload &
  BestTimesData & {
    companyId?: string;
  };

import type { MediaFile } from "@/lib/social/utils";
export type { MediaFile };

export type CreatePostDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  initialPostType: SocialPostType;
  initialMediaFiles?: MediaFile[];
  onSuccess: () => void;
};

function getNextAvailableDate() {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function getMediaPreviewUrl(mediaFile: MediaFile) {
  return mediaFile.editedBlobUrl ?? mediaFile.previewUrl;
}

function isImageMedia(mediaFile: MediaFile) {
  return mediaFile.file.type.startsWith("image/");
}

function cleanupMediaFile(mediaFile: MediaFile) {
  if (mediaFile.editedBlobUrl) {
    URL.revokeObjectURL(mediaFile.editedBlobUrl);
  }
  if (mediaFile.revokePreviewOnDispose && mediaFile.previewUrl !== mediaFile.editedBlobUrl) {
    URL.revokeObjectURL(mediaFile.previewUrl);
  }
}

function buildLibraryMediaFiles(items: MediaLibraryItem[]) {
  return items.map((item) => ({
    id: `library-${item.id}`,
    file: new File([], item.fileName, { type: item.fileType }),
    previewUrl: item.publicUrl,
    source: "library" as const,
    libraryItemId: item.id,
  }));
}

function canReuseLibraryIds(files: MediaFile[]) {
  return (
    files.length > 0 &&
    files.every(
      (mediaFile) =>
        mediaFile.source === "library" &&
        typeof mediaFile.libraryItemId === "string" &&
        !mediaFile.editedBlob
    )
  );
}

async function resolveUploadFile(mediaFile: MediaFile) {
  if (mediaFile.editedBlob) {
    return new File([mediaFile.editedBlob], mediaFile.file.name, {
      type: mediaFile.editedBlob.type || mediaFile.file.type || "application/octet-stream",
    });
  }

  if (mediaFile.file.size > 0) {
    return mediaFile.file;
  }

  const response = await fetch(mediaFile.previewUrl);
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${mediaFile.file.name} da biblioteca.`);
  }

  const blob = await response.blob();
  return new File([blob], mediaFile.file.name, {
    type: blob.type || mediaFile.file.type || "application/octet-stream",
  });
}

export function CreatePostDrawer({
  open,
  onClose,
  companyId,
  initialPostType,
  initialMediaFiles = [],
  onSuccess,
}: CreatePostDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const submitAtRef = useRef(0);
  const mediaFilesRef = useRef<MediaFile[]>([]);

  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [postType, setPostType] = useState<SocialPostType>(initialPostType);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMediaFiles);
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [publishNow, setPublishNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bestTime, setBestTime] = useState<BestTimeSlot | null>(null);

  const editingImage = useMemo(
    () => mediaFiles.find((mediaFile) => mediaFile.id === editingImageId) ?? null,
    [editingImageId, mediaFiles]
  );

  const mediaError = useMemo(() => validateClientMedia(postType, mediaFiles), [postType, mediaFiles]);

  const previewImageUrl = useMemo(() => {
    const firstImage = mediaFiles.find(isImageMedia);
    return firstImage ? getMediaPreviewUrl(firstImage) : null;
  }, [mediaFiles]);

  const bestTimeLabel = useMemo(() => {
    if (!bestTime) return null;
    return `${DAY_LABELS[bestTime.dayOfWeek] ?? "Dia"} ${String(bestTime.hour).padStart(2, "0")}h`;
  }, [bestTime]);

  const primaryLabel = publishNow ? "Publicar Agora" : "Confirmar Agendamento";
  const submitDisabled =
    isSubmitting ||
    mediaFiles.length === 0 ||
    Boolean(mediaError) ||
    platforms.length === 0 ||
    (!publishNow && !scheduledDate);

  const syncMediaFiles = useCallback((nextFiles: MediaFile[]) => {
    setMediaFiles((current) => {
      const nextIds = new Set(nextFiles.map((item) => item.id));
      current.forEach((item) => {
        if (!nextIds.has(item.id)) {
          cleanupMediaFile(item);
        }
      });
      return nextFiles;
    });
  }, []);

  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  useEffect(() => {
    if (open) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    if (!isMounted) {
      return;
    }

    setIsVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsMounted(false);
    }, 300);
  }, [open, isMounted]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPostType(initialPostType);
    syncMediaFiles(initialMediaFiles.map((mediaFile) => ({ ...mediaFile })));
    setCaption("");
    setConnectedPlatforms([]);
    setPlatforms([]);
    setPublishNow(true);
    setScheduledDate(null);
    setIsSubmitting(false);
    setError(null);
    setFeedback(null);
    setEditingImageId(null);
    setIsLibraryPickerOpen(false);
    setPreviewOpen(false);
    setBestTime(null);
  }, [open, initialPostType, initialMediaFiles, syncMediaFiles]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMounted, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoadingPlatforms(true);

    const fetchConnectedPlatforms = async () => {
      try {
        const response = await fetch("/api/social/connected-platforms");
        const payload = (await response.json()) as ApiErrorPayload & {
          connected?: ConnectedPlatform[];
        };

        if (!active) {
          return;
        }

        if (!response.ok) {
          setError(payload.error ?? "Falha ao carregar plataformas conectadas.");
          return;
        }

        const nextConnected = payload.connected ?? [];
        setConnectedPlatforms(nextConnected);
        setPlatforms((current) => {
          const available = new Set(nextConnected.map((item) => item.platform));
          const nextCurrent = current.filter((platform) => available.has(platform));
          if (nextCurrent.length > 0) {
            return nextCurrent;
          }
          return nextConnected[0] ? [nextConnected[0].platform] : [];
        });
      } catch (fetchError) {
        if (active) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Falha ao carregar plataformas conectadas."
          );
        }
      } finally {
        if (active) {
          setIsLoadingPlatforms(false);
        }
      }
    };

    void fetchConnectedPlatforms();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    const fetchBestTime = async () => {
      try {
        const params = new URLSearchParams({ companyId });
        if (platforms.length === 1) {
          params.set("platform", platforms[0]);
        }

        const response = await fetch(`/api/social/best-times?${params.toString()}`);
        const payload = (await response.json()) as BestTimesPayload;

        if (!active || !response.ok) {
          if (active) {
            setBestTime(null);
          }
          return;
        }

        setBestTime(payload.slots?.[0] ?? null);
      } catch {
        if (active) {
          setBestTime(null);
        }
      }
    };

    void fetchBestTime();
    return () => {
      active = false;
    };
  }, [open, companyId, platforms]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      mediaFilesRef.current.forEach((mediaFile) => {
        cleanupMediaFile(mediaFile);
      });
    };
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      const files = Array.from(fileList);
      const inferredType = inferPostTypeFromFiles(files);

      if (!inferredType) {
        setError("Use uma imagem, um vídeo ou entre 2 e 10 imagens para carrossel.");
        return;
      }

      for (const file of files) {
        const maxSize = file.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(1);
          const maxMB = (maxSize / 1024 / 1024).toFixed(0);
          setError(
            `${file.name} é muito grande (${sizeMB}MB). Limite: ${maxMB}MB para ${
              file.type.startsWith("video/") ? "vídeos" : "imagens"
            }.`
          );
          return;
        }
      }

      const nextMediaFiles = buildUploadMediaFiles(files);
      const nextMediaError = validateClientMedia(inferredType, nextMediaFiles);

      if (nextMediaError) {
        nextMediaFiles.forEach((mediaFile) => cleanupMediaFile(mediaFile));
        setError(nextMediaError);
        return;
      }

      setPostType(inferredType);
      setEditingImageId(null);
      setError(null);
      setFeedback(null);
      syncMediaFiles(nextMediaFiles);
    },
    [syncMediaFiles]
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(event.target.files);
    event.target.value = "";
  };

  const onDropFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onFilesSelected(event.dataTransfer.files);
  };

  const removeMediaFile = useCallback((id: string) => {
    setMediaFiles((current) => {
      const removed = current.find((mediaFile) => mediaFile.id === id);
      if (removed) {
        cleanupMediaFile(removed);
      }
      return current.filter((mediaFile) => mediaFile.id !== id);
    });
    setEditingImageId((current) => (current === id ? null : current));
  }, []);

  const handleSaveEditedImage = useCallback((blob: Blob) => {
    if (!editingImageId) {
      return;
    }

    const nextBlobUrl = URL.createObjectURL(blob);

    setMediaFiles((current) =>
      current.map((mediaFile) => {
        if (mediaFile.id !== editingImageId) {
          return mediaFile;
        }

        if (mediaFile.editedBlobUrl) {
          URL.revokeObjectURL(mediaFile.editedBlobUrl);
        }

        return {
          ...mediaFile,
          editedBlob: blob,
          editedBlobUrl: nextBlobUrl,
        };
      })
    );

    setEditingImageId(null);
    setError(null);
  }, [editingImageId]);

  const handleLibrarySelect = useCallback(
    (selectedItems: MediaLibraryItem[]) => {
      const inferredType = inferPostTypeFromLibraryItems(selectedItems);
      if (!inferredType) {
        setError("Selecione uma mídia única ou um conjunto de imagens válido.");
        return;
      }

      const nextMediaFiles = buildLibraryMediaFiles(selectedItems);
      const nextMediaError = validateClientMedia(inferredType, nextMediaFiles);

      if (nextMediaError) {
        setError(nextMediaError);
        return;
      }

      setPostType(inferredType);
      setEditingImageId(null);
      setError(null);
      setFeedback(null);
      syncMediaFiles(nextMediaFiles);
    },
    [syncMediaFiles]
  );

  const togglePlatform = (platform: SocialPlatform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleInsertHashtags = (hashtags: string) => {
    setCaption((current) => (current.trim() ? `${current.trim()}\n\n${hashtags}` : hashtags));
  };

  const handleScheduleMode = (nextPublishNow: boolean) => {
    setPublishNow(nextPublishNow);
    if (!nextPublishNow && !scheduledDate) {
      setScheduledDate(getNextAvailableDate());
    }
  };

  const submitSchedule = async () => {
    const now = Date.now();
    if (now - submitAtRef.current < 1200 || isSubmitting) {
      return;
    }
    submitAtRef.current = now;

    setFeedback(null);
    setError(null);

    if (connectedPlatforms.length === 0) {
      setError("Nenhuma plataforma conectada. Configure em Configurações > Integrações.");
      return;
    }

    if (mediaError) {
      setError(mediaError);
      return;
    }

    if (platforms.length === 0) {
      setError("Selecione ao menos uma plataforma.");
      return;
    }

    const availablePlatforms = new Set(connectedPlatforms.map((item) => item.platform));
    const invalidPlatforms = platforms.filter((platform) => !availablePlatforms.has(platform));
    if (invalidPlatforms.length > 0) {
      setError(`Plataforma não conectada: ${invalidPlatforms.join(", ")}`);
      return;
    }

    if (!publishNow && !scheduledDate) {
      setError("Defina data e horário para agendamento.");
      return;
    }

    const formData = new FormData();
    formData.set("companyId", companyId);
    formData.set("postType", postType);
    formData.set("caption", caption);
    formData.set("platforms", JSON.stringify(platforms));
    formData.set("publishNow", publishNow ? "true" : "false");
    if (scheduledDate) {
      formData.set("scheduledAt", scheduledDate.toISOString());
    }

    try {
      if (canReuseLibraryIds(mediaFiles)) {
        formData.set(
          "mediaFileIds",
          JSON.stringify(mediaFiles.map((mediaFile) => mediaFile.libraryItemId).filter(Boolean))
        );
      } else {
        const filesToUpload = await Promise.all(mediaFiles.map((mediaFile) => resolveUploadFile(mediaFile)));
        filesToUpload.forEach((file) => {
          formData.append("files", file, file.name);
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha ao preparar a mídia.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/social/schedule", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok) {
        setError(payload.error ?? "Falha ao publicar post.");
        return;
      }

      setFeedback(publishNow ? "Post enviado com sucesso." : "Post agendado com sucesso.");
      onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao publicar post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/70",
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        aria-modal="true"
        role="dialog"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-modal transition-transform duration-300 sm:max-w-[520px]",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
      >
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submitSchedule();
          }}
        >
          <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--color-text)]">
                  Novo Post · {postTypeLabel(postType)}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Crie, agende e revise sem trocar de tela.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar drawer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {POST_TYPE_OPTIONS.map((option) => {
                const selected = option.type === postType;
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      setPostType(option.type);
                      setError(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      selected
                        ? "border-[#FA5E24] bg-[#FA5E24] text-white"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[#FA5E24]/40 hover:text-[var(--color-text)]"
                    )}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-5 p-6">
              {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              {feedback ? (
                <div className="flex items-start gap-3 rounded-xl border border-[#22C55E]/20 bg-[var(--color-success-bg)] px-4 py-3 text-sm text-[#22C55E]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{feedback}</p>
                </div>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Mídia</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsLibraryPickerOpen(true)}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Da Biblioteca
                    </Button>
                  </div>
                </div>

                {editingImage ? (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
                    <ImageEditor
                      imageUrl={getMediaPreviewUrl(editingImage)}
                      onSave={handleSaveEditedImage}
                      onCancel={() => setEditingImageId(null)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={openFilePicker}
                      onDrop={onDropFiles}
                      onDragOver={(event) => event.preventDefault()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openFilePicker();
                        }
                      }}
                      className="flex h-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-center transition-all duration-200 hover:border-[#FA5E24]/60 hover:bg-[var(--color-surface-2)]"
                    >
                      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                        <Upload className="h-4 w-4 text-[#FA5E24]" />
                        <span>Arraste mídia ou clique</span>
                      </div>
                    </div>

                    {mediaFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {mediaFiles.map((mediaFile) => {
                          const imageMedia = isImageMedia(mediaFile);
                          return (
                            <div
                              key={mediaFile.id}
                              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
                            >
                              {imageMedia ? (
                                <img
                                  src={getMediaPreviewUrl(mediaFile)}
                                  alt={mediaFile.file.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <video
                                  src={getMediaPreviewUrl(mediaFile)}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => removeMediaFile(mediaFile.id)}
                                aria-label={`Remover ${mediaFile.file.name}`}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white transition-all duration-200 hover:bg-black/80"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>

                              {imageMedia ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-all duration-200 group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setEditingImageId(mediaFile.id)}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Editar
                                  </Button>
                                </div>
                              ) : (
                                <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white">
                                  Vídeo
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {mediaError ? (
                      <p className="text-sm text-[var(--color-danger)]">{mediaError}</p>
                    ) : null}
                  </div>
                )}
              </section>

              <div className="h-px bg-[var(--color-border)] my-4" />

              <section>
                <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">Legenda</p>
                <div className="space-y-3">
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="Escreva a legenda..."
                    className="min-h-[120px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all duration-200 placeholder:text-[var(--color-text-tertiary)] focus:ring-2 focus:ring-[#FA5E24]"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <HashtagGroupPicker companyId={companyId} onInsert={handleInsertHashtags} />
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      {caption.length} caractere(s)
                    </p>
                  </div>

                  <div className="space-y-2">
                    {platforms.length > 0 ? (
                      platforms.map((platform) => {
                        const limit = PLATFORM_LIMITS[platform];
                        const ratio = Math.min((caption.length / limit) * 100, 100);
                        const isOverLimit = caption.length > limit;
                        return (
                          <div key={platform} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                <PlatformIcon
                                  platform={platform}
                                  className="h-3.5 w-3.5"
                                />
                                <span>{PLATFORM_LABELS[platform]}</span>
                              </div>
                              <span
                                className={cn(
                                  isOverLimit
                                    ? "text-[var(--color-danger)]"
                                    : "text-[var(--color-text-tertiary)]"
                                )}
                              >
                                {caption.length}/{limit}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--color-surface-3)]">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-200",
                                  isOverLimit
                                    ? "bg-[var(--color-danger)]"
                                    : ratio > 80
                                      ? "bg-[#FA5E24]"
                                      : "bg-[var(--module-color)]"
                                )}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        Selecione uma plataforma para visualizar os limites de legenda.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-[var(--color-border)] my-4" />

              <section>
                <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">Plataformas</p>
                {isLoadingPlatforms ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#FA5E24]" />
                    Carregando plataformas conectadas...
                  </div>
                ) : connectedPlatforms.length === 0 ? (
                  <div className="rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <p>Nenhuma plataforma conectada.</p>
                        <Link
                          href="/settings?tab=social"
                          className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
                        >
                          Ir para redes sociais
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {connectedPlatforms.map(({ platform, accountName }) => {
                      const selected = platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200",
                            selected
                              ? "border-[#FA5E24] bg-[#FA5E24] text-white"
                              : "border-transparent bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                          )}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: PLATFORM_BRAND_COLORS[platform] }}
                          />
                          <PlatformIcon
                            platform={platform}
                            className={cn(
                              "h-4 w-4",
                              selected ? "text-white" : undefined
                            )}
                            colored={!selected}
                          />
                          <span>{PLATFORM_LABELS[platform]}</span>
                          {accountName ? (
                            <span className={cn("text-xs", selected ? "text-white/80" : "text-[var(--color-text-tertiary)]")}>
                              · {accountName}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="h-px bg-[var(--color-border)] my-4" />

              <section>
                <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">Quando publicar</p>
                <div className="space-y-4">
                  <div className="inline-flex rounded-xl bg-[var(--color-surface-2)] p-1">
                    <button
                      type="button"
                      onClick={() => handleScheduleMode(true)}
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                        publishNow
                          ? "bg-[#FA5E24] text-white"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                      )}
                    >
                      Agora
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScheduleMode(false)}
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                        !publishNow
                          ? "bg-[#FA5E24] text-white"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                      )}
                    >
                      Agendar
                    </button>
                  </div>

                  {!publishNow ? (
                    <CalendarScheduler
                      selectedDate={scheduledDate}
                      onDateChange={setScheduledDate}
                      selectedPlatforms={platforms}
                    />
                  ) : null}

                  {bestTimeLabel ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-dim)] px-3 py-1.5 text-xs font-medium text-[#FA5E24]">
                      <Calendar className="h-3.5 w-3.5" />
                      Melhor horário: {bestTimeLabel}
                    </div>
                  ) : null}
                </div>
              </section>

              <div className="h-px bg-[var(--color-border)] my-4" />

              <section>
                <button
                  type="button"
                  onClick={() => setPreviewOpen((current) => !current)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--color-text)] transition-all duration-200 hover:text-[#FA5E24]"
                >
                  <span>Preview {previewOpen ? "▾" : "▸"}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {platforms.length > 0 ? `${platforms.length} plataforma(s)` : "Sem seleção"}
                  </span>
                </button>

                <div
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200",
                    previewOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden pt-4">
                    <MockupPreviews
                      imageUrl={previewImageUrl}
                      caption={caption}
                      platforms={platforms}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitDisabled}
                className="w-full bg-[#FA5E24] text-white hover:bg-[#E05320] sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  primaryLabel
                )}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={
              postType === "video" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp"
            }
            multiple={postType === "carousel"}
            className="hidden"
            onChange={handleInputChange}
          />
        </form>
      </aside>

      <MediaLibraryPicker
        companyId={companyId}
        mode={postType === "carousel" ? "multi" : "single"}
        fileTypeFilter={postType === "video" ? "video" : "image"}
        maxSelection={postType === "carousel" ? 10 : 1}
        open={isLibraryPickerOpen}
        onClose={() => setIsLibraryPickerOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </>
  );
}
