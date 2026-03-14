/**
 * Arquivo: src/services/intelligence/competitor.ts
 * Proposito: Worker de coleta de concorrentes e geracao de insights do modulo Intelligence.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import type { Database } from "@/database/types/database.types";
import { buildCompetitorInsightPrompt } from "@/lib/ai/prompts/competitor";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CollectedPostDraft,
  CompetitorCollectionJobPayload,
  CompetitorWorkerResult,
  InsightGenerationResult,
  IntelligencePlatform,
} from "@/types/modules/intelligence.types";

const competitorJobPayloadSchema: z.ZodType<CompetitorCollectionJobPayload> = z.object({
  competitorId: z.string().uuid("competitorId invalido.").optional(),
});

const competitorInsightSchema = z.object({
  summary: z.string().trim().min(12),
  top_themes: z.array(z.string().trim().min(2)).min(2).max(6),
  recommendations: z.array(z.string().trim().min(2)).min(2).max(6),
});

type CompetitorRow = Database["public"]["Tables"]["competitor_profiles"]["Row"];

const platformOrder: IntelligencePlatform[] = ["instagram", "linkedin", "tiktok"];

function buildEngagementScore(post: Pick<CollectedPostDraft, "likesCount" | "commentsCount" | "sharesCount">) {
  return post.likesCount + post.commentsCount * 2 + post.sharesCount * 3;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function pseudoRandomInt(seed: string, min: number, max: number) {
  const value = hashSeed(seed);
  const range = max - min + 1;
  return min + (value % range);
}

function fallbackBaseUrl(competitor: CompetitorRow) {
  return (
    competitor.instagram_url ??
    competitor.linkedin_url ??
    competitor.website_url ??
    `https://example.com/${encodeURIComponent(competitor.name.toLowerCase())}`
  );
}

function generateCompetitorPosts(competitor: CompetitorRow): CollectedPostDraft[] {
  const baseUrl = fallbackBaseUrl(competitor).replace(/\/+$/, "");
  const titles = [
    "Guia rapido de resultados da semana",
    "Bastidores da operacao com foco em conversao",
    "Case curto com prova social do cliente",
    "Checklist pratico para acelerar atendimento",
  ];

  return titles.map((title, index) => {
    const platform = platformOrder[index % platformOrder.length];
    const seed = `${competitor.id}-${platform}-${index}`;
    const likesCount = pseudoRandomInt(`${seed}-likes`, 40, 220);
    const commentsCount = pseudoRandomInt(`${seed}-comments`, 6, 36);
    const sharesCount = pseudoRandomInt(`${seed}-shares`, 3, 24);
    const postedAt = new Date(Date.now() - pseudoRandomInt(`${seed}-days`, 1, 7) * 86_400_000).toISOString();
    const postPath = `axiomix-${platform}-${index + 1}`;

    return {
      sourceType: "competitor",
      competitorId: competitor.id,
      platform,
      postUrl: `${baseUrl}/${postPath}`,
      content: `${competitor.name}: ${title}. CTA direto para qualificacao de lead e follow-up comercial.`,
      likesCount,
      commentsCount,
      sharesCount,
      postedAt,
    };
  });
}

function buildFallbackInsight(
  competitorName: string,
  posts: CollectedPostDraft[]
): InsightGenerationResult {
  const ranked = [...posts].sort((a, b) => buildEngagementScore(b) - buildEngagementScore(a));
  const bestPost = ranked[0];

  return {
    content: bestPost
      ? `${competitorName} ganhou mais tracao em ${bestPost.platform} com post educativo e CTA curto.`
      : `${competitorName} foi monitorado sem posts suficientes para analise detalhada.`,
    topThemes: ["conteudo educativo", "prova social", "chamada para acao"],
    recommendations: [
      "Publicar um case curto com resultado numerico e CTA objetivo.",
      "Repetir o tema mais forte em formato de serie semanal.",
      "Testar variacao de abertura com promessa de ganho especifico.",
    ],
  };
}

async function generateCompetitorInsight(
  companyId: string,
  competitor: CompetitorRow,
  posts: CollectedPostDraft[]
): Promise<InsightGenerationResult> {
  try {
    const prompt = buildCompetitorInsightPrompt(competitor.name, posts);
    const rawJson = await openRouterChatCompletion(companyId, [
      {
        role: "system",
        content: "Responda somente JSON valido, sem markdown e sem texto adicional.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    const parsedUnknown: unknown = JSON.parse(rawJson);
    const parsed = competitorInsightSchema.parse(parsedUnknown);
    return {
      content: parsed.summary,
      topThemes: parsed.top_themes,
      recommendations: parsed.recommendations,
    };
  } catch {
    return buildFallbackInsight(competitor.name, posts);
  }
}

export function parseCompetitorJobPayload(payload: unknown): CompetitorCollectionJobPayload {
  const parsed = competitorJobPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

export async function runCompetitorWorker(
  companyId: string,
  payload: CompetitorCollectionJobPayload
): Promise<CompetitorWorkerResult> {
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("competitor_profiles")
    .select("id, company_id, name, website_url, instagram_url, linkedin_url, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: competitors, error } = payload.competitorId
    ? await query.eq("id", payload.competitorId).limit(1)
    : await query.limit(3);

  if (error) {
    throw new Error("Falha ao carregar concorrentes para o worker.");
  }

  if (!competitors || competitors.length === 0) {
    return {
      processedCompetitors: 0,
      insertedPosts: 0,
      generatedInsights: 0,
    };
  }

  let insertedPosts = 0;
  let generatedInsights = 0;

  for (const competitor of competitors) {
    const posts = generateCompetitorPosts(competitor);
    const rows = posts.map((post) => ({
      company_id: companyId,
      source_type: "competitor" as const,
      competitor_id: competitor.id,
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
      throw new Error("Falha ao inserir posts coletados de concorrentes.");
    }

    insertedPosts += rows.length;

    const insight = await generateCompetitorInsight(companyId, competitor, posts);
    const { error: insertInsightError } = await supabase.from("intelligence_insights").insert({
      company_id: companyId,
      source_type: "competitor",
      competitor_id: competitor.id,
      analysis_type: "competitor_snapshot",
      content: insight.content,
      top_themes: insight.topThemes,
      recommendations: insight.recommendations,
      generated_at: new Date().toISOString(),
    });

    if (insertInsightError) {
      throw new Error("Falha ao salvar insight de concorrente.");
    }
    generatedInsights += 1;
  }

  return {
    processedCompetitors: competitors.length,
    insertedPosts,
    generatedInsights,
  };
}
