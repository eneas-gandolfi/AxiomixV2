/**
 * Arquivo: src/types/modules/dashboard.types.ts
 * Propósito: Tipos compartilhados do módulo Dashboard redesenhado
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

/* ---------- Sentiment Trend Chart ---------- */

export type SentimentTrendDataPoint = {
  date: string;
  positivo: number;
  neutro: number;
  negativo: number;
};

/* ---------- Content Performance by Platform ---------- */

export type ContentPerformancePlatform = "instagram" | "linkedin" | "tiktok";

export type ContentPerformanceDataPoint = {
  platform: ContentPerformancePlatform;
  platformLabel: string;
  published: number;
  failed: number;
};

/* ---------- Competitive Intelligence ---------- */

export type ViralPostHighlight = {
  id: string;
  platform: "instagram" | "linkedin" | "tiktok";
  content: string;
  engagementScore: number;
  postUrl: string | null;
  competitorName: string | null;
  collectedAt: string;
};

export type CompetitiveIntelligenceData = {
  viralPosts: ViralPostHighlight[];
  trendingThemes: string[];
  recommendations: string[];
  totalCompetitors: number;
  lastInsightAt: string | null;
};
