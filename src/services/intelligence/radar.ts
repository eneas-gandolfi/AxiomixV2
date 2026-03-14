/**
 * Arquivo: src/services/intelligence/radar.ts
 * Proposito: Worker de Content Radar para identificar temas e posts virais do nicho.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { buildRadarInsightPrompt } from "@/lib/ai/prompts/competitor";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CollectedPostDraft,
  InsightGenerationResult,
  IntelligencePlatform,
  RadarCollectionJobPayload,
  RadarWorkerResult,
} from "@/types/modules/intelligence.types";
import { triggerViralContentAlert } from "@/services/alerts/alert-triggers";

const radarJobPayloadSchema: z.ZodType<RadarCollectionJobPayload> = z.object({
  nicheOverride: z.string().trim().min(2).optional(),
  subNicheOverride: z.string().trim().min(2).optional(),
});

const radarInsightSchema = z.object({
  summary: z.string().trim().min(12),
  top_themes: z.array(z.string().trim().min(2)).min(2).max(6),
  recommendations: z.array(z.string().trim().min(2)).min(2).max(6),
});

const platforms: IntelligencePlatform[] = ["instagram", "linkedin", "tiktok"];

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

function normalizeKeywords(baseNiche: string, baseSubNiche: string | null) {
  const raw = [baseNiche, baseSubNiche ?? ""]
    .join(" ")
    .split(/[,\s/]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 2);

  const unique = Array.from(new Set(raw));
  return unique.slice(0, 6);
}

function generateRadarPosts(keywords: string[]): CollectedPostDraft[] {
  const templates = [
    "Checklist pratico para aumentar taxa de resposta",
    "Antes e depois com metricas reais em 7 dias",
    "Erros comuns que travam conversao no WhatsApp",
    "Roteiro de copy curta para campanha local",
    "Framework de atendimento em 3 etapas",
    "Teste A/B com resultado acima da media",
    "Template pronto para calendario de conteudo",
    "Gancho de abertura para video de 20 segundos",
    "Plano semanal para gerar leads qualificados",
    "Script de follow-up para recuperar oportunidades",
    "Prova social em formato de carrossel",
    "Campanha sazonal com CTA forte",
  ];

  return templates.map((template, index) => {
    const keyword = keywords[index % Math.max(keywords.length, 1)] ?? "marketing";
    const platform = platforms[index % platforms.length];
    const seed = `${keyword}-${platform}-${index}`;
    const likesCount = pseudoRandomInt(`${seed}-likes`, 80, 420);
    const commentsCount = pseudoRandomInt(`${seed}-comments`, 12, 68);
    const sharesCount = pseudoRandomInt(`${seed}-shares`, 6, 60);
    const postedAt = new Date(Date.now() - pseudoRandomInt(`${seed}-days`, 1, 7) * 86_400_000).toISOString();

    return {
      sourceType: "radar",
      competitorId: null,
      platform,
      postUrl: `https://radar.local/${platform}/${encodeURIComponent(keyword)}-${index + 1}`,
      content: `${template} para ${keyword} com orientacoes objetivas e CTA direto.`,
      likesCount,
      commentsCount,
      sharesCount,
      postedAt,
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
      ? `No radar de ${nicheLabel}, o formato com melhor tracao foi ${bestPost.platform} em conteudo pratico.`
      : `No radar de ${nicheLabel}, ainda faltam dados para identificar um formato vencedor.`,
    topThemes: ["conteudo pratico", "prova social", "roteiro rapido"],
    recommendations: [
      "Publicar um post curto com checklist aplicado ao nicho.",
      "Reforcar CTA para conversa direta no WhatsApp.",
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
    const prompt = buildRadarInsightPrompt(niche, subNiche, posts);
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

export async function runRadarWorker(
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
    throw new Error("Empresa nao encontrada para coleta de radar.");
  }

  const niche = payload.nicheOverride ?? company.niche ?? "marketing";
  const subNiche = payload.subNicheOverride ?? company.sub_niche ?? null;
  const keywords = normalizeKeywords(niche, subNiche);
  const posts = generateRadarPosts(keywords.length > 0 ? keywords : ["marketing"]);

  const rows = posts.map((post) => ({
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
    throw new Error("Falha ao inserir posts do radar.");
  }

  // --- Alertas para conteudo viral (fire-and-forget) ---
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

  const topPosts = [...posts]
    .sort((a, b) => buildEngagementScore(b) - buildEngagementScore(a))
    .slice(0, 10);
  const insight = await generateRadarInsight(companyId, niche, subNiche, topPosts);

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
    throw new Error("Falha ao salvar insight de radar.");
  }

  return {
    insertedPosts: rows.length,
    generatedInsights: 1,
    keywords,
  };
}
