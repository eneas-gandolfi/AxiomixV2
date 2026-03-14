/**
 * Arquivo: src/types/modules/social-publisher.types.ts
 * Proposito: Tipos compartilhados do modulo Social Publisher.
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
