/**
 * Arquivo: src/types/modules/social-publisher.types.ts
 * Propósito: Tipos compartilhados do modulo Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

export type SocialPostType = "photo" | "video" | "carousel";
export type SocialPlatform = "instagram" | "linkedin" | "tiktok" | "facebook";
export type SocialPublishStatus =
  | "scheduled"
  | "processing"
  | "published"
  | "partial"
  | "failed"
  | "cancelled";

export type PlatformProgressState = "pending" | "processing" | "ok" | "error";

export type PlatformProgressItem = {
  status: PlatformProgressState;
  externalPostId?: string;
  error?: string;
  updatedAt: string;
};

export type PublishProgressMap = Partial<Record<SocialPlatform, PlatformProgressItem>>;

export type PublishResultMap = Partial<Record<SocialPlatform, string>>;
export type PublishErrorMap = Partial<Record<SocialPlatform, string>>;

export type HashtagGroup = {
  id: string;
  companyId: string;
  name: string;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
};

export type HashtagGroupInput = {
  name: string;
  hashtags: string[];
};

export type BestTimeSlot = {
  dayOfWeek: number; // 0=Dom ... 6=Sab
  hour: number;      // 0-23
  postCount: number;
};

export type BestTimesData = {
  platform: SocialPlatform | "all";
  slots: BestTimeSlot[];
  totalPublished: number;
};

export type CalendarPostItem = {
  id: string;
  postType: SocialPostType;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: SocialPublishStatus;
  progress: PublishProgressMap;
  thumbnailUrl: string | null;
  mediaFileIds: string[];
};

export type CalendarViewFilter = {
  platforms: SocialPlatform[];
  status: SocialPublishStatus | "all";
};

/* ────────────────────────────────────────────────────────────────────────────
   Tipos compartilhados de UI — usados pelo dashboard, histórico, tabela e modal
   ──────────────────────────────────────────────────────────────────────────── */

export type ScheduledHistoryItem = {
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

export type HistoryResponse = {
  items: ScheduledHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ConnectedPlatform = {
  platform: SocialPlatform;
  accountName: string | null;
};

export type ApiErrorPayload = {
  error?: string;
};

export const STATUS_COLORS: Record<SocialPublishStatus, string> = {
  scheduled: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  processing: "bg-[var(--color-primary-dim)] text-[#FA5E24]",
  published: "bg-[var(--color-success-bg)] text-[#22C55E]",
  partial: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  failed: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  cancelled: "bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]",
};

export const STATUS_LABELS: Record<SocialPublishStatus, string> = {
  scheduled: "Agendado",
  processing: "Processando",
  published: "Publicado",
  partial: "Parcial",
  failed: "Falhou",
  cancelled: "Cancelado",
};
