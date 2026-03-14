/**
 * Arquivo: src/types/modules/intelligence.types.ts
 * Proposito: Tipos compartilhados do modulo Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

export type IntelligenceSourceType = "competitor" | "radar";
export type IntelligencePlatform = "instagram" | "linkedin" | "tiktok";

export type CompetitorCollectionJobPayload = {
  competitorId?: string;
};

export type RadarCollectionJobPayload = {
  nicheOverride?: string;
  subNicheOverride?: string;
};

export type CollectedPostDraft = {
  sourceType: IntelligenceSourceType;
  competitorId?: string | null;
  platform: IntelligencePlatform;
  postUrl: string | null;
  content: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  postedAt: string;
};

export type InsightGenerationResult = {
  content: string;
  topThemes: string[];
  recommendations: string[];
};

export type CompetitorWorkerResult = {
  processedCompetitors: number;
  insertedPosts: number;
  generatedInsights: number;
};

export type RadarWorkerResult = {
  insertedPosts: number;
  generatedInsights: number;
  keywords: string[];
};
