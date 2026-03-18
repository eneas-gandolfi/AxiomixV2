/**
 * Arquivo: src/services/intelligence/radar-enhanced.ts
 * Propósito: Worker de Content Radar com scraping via Apify + dados mockados como fallback
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { z } from "zod";
import { buildRadarInsightPrompt } from "@/lib/ai/prompts/competitor";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  scrapeInstagramHashtag,
  scrapeTikTokHashtag,
  type ApifyInstagramPost,
  type ApifyTikTokPost,
} from "@/lib/scraping/apify-client";
import type {
  CollectedPostDraft,
  InsightGenerationResult,
  IntelligencePlatform,
  RadarCollectionJobPayload,
  RadarWorkerResult,
} from "@/types/modules/intelligence.types";
import { triggerViralContentAlert } from "@/services/alerts/alert-triggers";
import { getKnowledgeBaseContext } from "@/services/rag/kb-context";

const radarJobPayloadSchema: z.ZodType<RadarCollectionJobPayload> = z.object({
  nicheOverride: z.string().trim().min(2).optional(),
  subNicheOverride: z.string().trim().min(2).optional(),
});

const radarInsightSchema = z.object({
  summary: z.string().trim().min(12),
  top_themes: z.array(z.string().trim().min(2)).min(2).max(6),
  recommendations: z.array(z.string().trim().min(2)).min(2).max(6),
});

function buildEngagementScore(post: Pick<CollectedPostDraft, "likesCount" | "commentsCount" | "sharesCount">) {
  return post.likesCount + post.commentsCount * 2 + post.sharesCount * 3;
}

function normalizeKeywords(baseNiche: string, baseSubNiche: string | null) {
  const raw = [baseNiche, baseSubNiche ?? ""]
    .join(" ")
    .split(/[,\s/]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 2);

  const unique = Array.from(new Set(raw));
  return unique.slice(0, 6);
}

/**
 * Converter post do Instagram (Apify) para formato padrão
 */
function convertInstagramPost(post: ApifyInstagramPost): CollectedPostDraft | null {
  try {
    return {
      sourceType: "radar",
      competitorId: null,
      platform: "instagram",
      postUrl: post.url,
      content: post.caption ?? "Sem legenda",
      likesCount: post.likesCount ?? 0,
      commentsCount: post.commentsCount ?? 0,
      sharesCount: 0, // Instagram não fornece shares via scraping
      postedAt: post.timestamp ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Converter post do TikTok (Apify) para formato padrão
 */
function convertTikTokPost(post: ApifyTikTokPost): CollectedPostDraft | null {
  try {
    return {
      sourceType: "radar",
      competitorId: null,
      platform: "tiktok",
      postUrl: post.webVideoUrl,
      content: post.text ?? "Sem descrição",
      likesCount: post.diggCount ?? 0,
      commentsCount: post.commentCount ?? 0,
      sharesCount: post.shareCount ?? 0,
      postedAt: post.createTime ? new Date(post.createTime * 1000).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Coletar posts via Apify (Instagram e TikTok)
 */
async function collectPostsViaApify(
  keywords: string[],
  minEngagement: number = 100
): Promise<CollectedPostDraft[]> {
  const posts: CollectedPostDraft[] = [];

  // Para cada keyword, coletar do Instagram e TikTok
  for (const keyword of keywords.slice(0, 3)) {
    // Limitar a 3 keywords
    const hashtag = keyword.startsWith("#") ? keyword.slice(1) : keyword;

    try {
      // Instagram
      const instagramPosts = await scrapeInstagramHashtag(hashtag, 10);
      const convertedInstagram = instagramPosts
        .map(convertInstagramPost)
        .filter((p): p is CollectedPostDraft => p !== null)
        .filter((p) => buildEngagementScore(p) >= minEngagement);
      posts.push(...convertedInstagram);

      // TikTok
      const tiktokPosts = await scrapeTikTokHashtag(hashtag, 10);
      const convertedTikTok = tiktokPosts
        .map(convertTikTokPost)
        .filter((p): p is CollectedPostDraft => p !== null)
        .filter((p) => buildEngagementScore(p) >= minEngagement);
      posts.push(...convertedTikTok);
    } catch (error) {
      console.error(`Erro ao coletar posts para keyword "${keyword}":`, error);
    }
  }

  return posts;
}

/**
 * Gerar posts mockados como fallback (caso Apify falhe)
 */
function generateFallbackPosts(keywords: string[]): CollectedPostDraft[] {
  const templates = [
    "Checklist prático para aumentar taxa de resposta",
    "Antes e depois com métricas reais em 7 dias",
    "Erros comuns que travam conversão no WhatsApp",
    "Roteiro de copy curta para campanha local",
    "Framework de atendimento em 3 etapas",
    "Teste A/B com resultado acima da média",
  ];

  const platforms: IntelligencePlatform[] = ["instagram", "tiktok"];

  return templates.map((template, index) => {
    const keyword = keywords[index % Math.max(keywords.length, 1)] ?? "marketing";
    const platform = platforms[index % platforms.length];
    const likesCount = 80 + index * 50;
    const commentsCount = 12 + index * 8;
    const sharesCount = platform === "tiktok" ? 6 + index * 4 : 0;

    return {
      sourceType: "radar",
      competitorId: null,
      platform,
      postUrl: null, // Posts mockados não têm URL real
      content: `${template} para ${keyword} com orientações objetivas e CTA direto.`,
      likesCount,
      commentsCount,
      sharesCount,
      postedAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
    };
  });
}

function buildFallbackRadarInsight(
  niche: string,
  subNiche: string | null,
  posts: CollectedPostDraft[]
): InsightGenerationResult {
  const ranked = [...posts].sort((a, b) => buildEngagementScore(b) - buildEngagementScore(a));
  const bestPost = ranked[0];
  const nicheLabel = subNiche ? `${niche} / ${subNiche}` : niche;

  return {
    content: bestPost
      ? `No radar de ${nicheLabel}, o formato com melhor tração foi ${bestPost.platform} em conteúdo prático.`
      : `No radar de ${nicheLabel}, ainda faltam dados para identificar um formato vencedor.`,
    topThemes: ["conteúdo prático", "prova social", "roteiro rápido"],
    recommendations: [
      "Publicar um post curto com checklist aplicado ao nicho.",
      "Reforçar CTA para conversa direta no WhatsApp.",
      "Replicar o tema com melhor score em duas plataformas.",
    ],
  };
}

async function generateRadarInsight(
  companyId: string,
  niche: string,
  subNiche: string | null,
  posts: CollectedPostDraft[]
): Promise<InsightGenerationResult> {
  try {
    const kbContext = await getKnowledgeBaseContext(
      companyId,
      `diretrizes marca tom de voz conteúdo ${niche}`
    );
    const prompt = buildRadarInsightPrompt(niche, subNiche, posts, kbContext || undefined);
    const rawJson = await openRouterChatCompletion(companyId, [
      {
        role: "system",
        content: "Responda somente JSON válido, sem markdown e sem texto adicional.",
      },
      {
        role: "user",
        content: prompt,
      },
    ], {
      model: process.env.OPENROUTER_MODEL_LIGHT,
    });

    const parsedUnknown: unknown = JSON.parse(rawJson);
    const parsed = radarInsightSchema.parse(parsedUnknown);
    return {
      content: parsed.summary,
      topThemes: parsed.top_themes,
      recommendations: parsed.recommendations,
    };
  } catch {
    return buildFallbackRadarInsight(niche, subNiche, posts);
  }
}

export function parseRadarJobPayload(payload: unknown): RadarCollectionJobPayload {
  const parsed = radarJobPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

export async function runRadarWorkerEnhanced(
  companyId: string,
  payload: RadarCollectionJobPayload
): Promise<RadarWorkerResult> {
  const supabase = createSupabaseAdminClient();
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, niche, sub_niche")
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    throw new Error("Empresa não encontrada para coleta de radar.");
  }

  const niche = payload.nicheOverride ?? company.niche ?? "marketing";
  const subNiche = payload.subNicheOverride ?? company.sub_niche ?? null;
  const keywords = normalizeKeywords(niche, subNiche);

  // Tentar coletar via Apify primeiro
  console.log(`[Radar] Coletando posts via Apify para keywords: ${keywords.join(", ")}`);
  let posts = await collectPostsViaApify(keywords.length > 0 ? keywords : ["marketing"], 100);

  // Se não conseguiu nada via Apify, usar fallback
  if (posts.length === 0) {
    console.log("[Radar] Apify não retornou posts. Usando fallback mockado.");
    posts = generateFallbackPosts(keywords.length > 0 ? keywords : ["marketing"]);
  } else {
    console.log(`[Radar] Coletados ${posts.length} posts via Apify`);
  }

  // Ordenar por engagement e pegar top posts
  const sortedPosts = [...posts].sort((a, b) => buildEngagementScore(b) - buildEngagementScore(a));
  const topPosts = sortedPosts.slice(0, 5); // Top 5 posts

  // Inserir no banco
  const rows = topPosts.map((post) => ({
    company_id: companyId,
    source_type: "radar" as const,
    competitor_id: null,
    platform: post.platform,
    post_url: post.postUrl,
    content: post.content,
    likes_count: post.likesCount,
    comments_count: post.commentsCount,
    shares_count: post.sharesCount,
    engagement_score: buildEngagementScore(post),
    posted_at: post.postedAt,
    collected_at: new Date().toISOString(),
  }));

  const { error: insertPostsError } = await supabase.from("collected_posts").insert(rows);
  if (insertPostsError) {
    console.error("[Radar] Erro ao inserir posts:", insertPostsError);
    throw new Error("Falha ao inserir posts do radar.");
  }

  // --- Alertas para conteúdo viral (fire-and-forget) ---
  const VIRAL_THRESHOLD = 300;
  for (const viralPost of rows.filter((row) => row.engagement_score >= VIRAL_THRESHOLD)) {
    triggerViralContentAlert({
      companyId,
      platform: viralPost.platform,
      engagementScore: viralPost.engagement_score,
      content: viralPost.content ?? "",
      postUrl: viralPost.post_url,
      sourceId: viralPost.post_url ?? `${viralPost.platform}-${viralPost.engagement_score}`,
    });
  }

  // Gerar insight
  const insight = await generateRadarInsight(companyId, niche, subNiche, topPosts.slice(0, 10));

  const { error: insertInsightError } = await supabase.from("intelligence_insights").insert({
    company_id: companyId,
    source_type: "radar",
    competitor_id: null,
    analysis_type: "radar_weekly",
    content: insight.content,
    top_themes: insight.topThemes,
    recommendations: insight.recommendations,
    generated_at: new Date().toISOString(),
  });

  if (insertInsightError) {
    console.error("[Radar] Erro ao salvar insight:", insertInsightError);
    throw new Error("Falha ao salvar insight de radar.");
  }

  return {
    insertedPosts: rows.length,
    generatedInsights: 1,
    keywords,
  };
}
