/**
 * Arquivo: src/lib/social/utils.ts
 * Propósito: Funções utilitárias compartilhadas pelo módulo Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-18
 */

import type {
  PublishProgressMap,
  SocialPlatform,
  SocialPostType,
  PlatformProgressState,
} from "@/types/modules/social-publisher.types";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";

/* ── Constantes de mídia ─────────────────────────────────────────────────── */

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

/* ── Tipo local para MediaFile usado no client ───────────────────────────── */

export type MediaFile = {
  id: string;
  file: File;
  previewUrl: string;
  editedBlob?: Blob;
  editedBlobUrl?: string;
  source: "upload" | "library";
  libraryItemId?: string;
  revokePreviewOnDispose?: boolean;
};

/* ── Labels ──────────────────────────────────────────────────────────────── */

export function postTypeLabel(postType: SocialPostType) {
  if (postType === "photo") return "Foto";
  if (postType === "video") return "Vídeo";
  return "Carrossel";
}

export function progressStateLabel(status: PlatformProgressState) {
  if (status === "pending") return "pendente";
  if (status === "processing") return "processando";
  if (status === "ok") return "ok";
  return "erro";
}

/* ── Formatação de datas ─────────────────────────────────────────────────── */

export function formatDate(value: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatCardDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDate(value: string | null) {
  if (!value) return "Sem data";

  const target = new Date(value);
  const diff = target.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absDiff < minute) return "agora";
  if (absDiff < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (absDiff < day) return rtf.format(Math.round(diff / hour), "hour");
  if (absDiff < month) return rtf.format(Math.round(diff / day), "day");
  if (absDiff < year) return rtf.format(Math.round(diff / month), "month");
  return rtf.format(Math.round(diff / year), "year");
}

/* ── Normalização de payloads real-time ──────────────────────────────────── */

export function normalizeStringMap(raw: unknown): Record<string, string> {
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

export function normalizeProgress(raw: unknown): PublishProgressMap {
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

/* ── Validação e inferência de mídia ─────────────────────────────────────── */

export function validateClientMedia(postType: SocialPostType, files: MediaFile[]) {
  if (files.length === 0) return null;

  if (postType === "photo") {
    if (files.length !== 1) return "Foto exige exatamente 1 imagem.";
    if (!IMAGE_TYPES.has(files[0].file.type)) return "Foto aceita jpg, png ou webp.";
    return null;
  }

  if (postType === "video") {
    if (files.length !== 1) return "Vídeo exige exatamente 1 arquivo.";
    if (!VIDEO_TYPES.has(files[0].file.type)) return "Vídeo aceita mp4 ou mov.";
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

export function inferPostTypeFromFiles(files: File[]): SocialPostType | null {
  if (files.length === 0) return null;
  if (files.length === 1) {
    if (IMAGE_TYPES.has(files[0].type)) return "photo";
    if (VIDEO_TYPES.has(files[0].type)) return "video";
    return null;
  }
  return files.every((file) => IMAGE_TYPES.has(file.type)) ? "carousel" : null;
}

export function inferPostTypeFromLibraryItems(items: MediaLibraryItem[]): SocialPostType | null {
  if (items.length === 0) return null;
  if (items.length === 1) {
    if (IMAGE_TYPES.has(items[0].fileType)) return "photo";
    if (VIDEO_TYPES.has(items[0].fileType)) return "video";
    return null;
  }
  return items.every((item) => IMAGE_TYPES.has(item.fileType)) ? "carousel" : null;
}

export function buildUploadMediaFiles(files: File[]): MediaFile[] {
  return files.map((file) => ({
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    source: "upload" as const,
    revokePreviewOnDispose: true,
  }));
}

/* ── Helpers de mídia ────────────────────────────────────────────────────── */

export function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
