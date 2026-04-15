/**
 * Arquivo: src/services/social/publisher.ts
 * Propósito: Implementar validação, agendamento, cancelamento e publicação do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import "server-only";

import type { Database, Json } from "@/database/types/database.types";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadMediaToCloudinary } from "@/services/social/cloudinary-upload";
import { triggerFailedPostAlert } from "@/services/alerts/alert-triggers";
import type {
  PlatformProgressItem,
  PublishErrorMap,
  PublishProgressMap,
  PublishResultMap,
  SocialPlatform,
  SocialPostType,
  SocialPublishStatus,
} from "@/types/modules/social-publisher.types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const SUPPORTED_PLATFORMS = new Set<SocialPlatform>(["instagram", "linkedin", "tiktok", "facebook"]);

// Limites de midia por plataforma (fonte: docs publicas das redes / Upload-Post).
// bytes: maximo em bytes; videoSeconds: [min, max]; aspect: [min, max] (width/height).
type PlatformMediaLimits = {
  imageBytes: number;
  videoBytes: number;
  videoSeconds: [number, number];
  aspect: [number, number];
};

const PLATFORM_LIMITS: Record<SocialPlatform, PlatformMediaLimits> = {
  instagram: {
    imageBytes: 8 * 1024 * 1024,
    videoBytes: 100 * 1024 * 1024,
    videoSeconds: [3, 90],
    aspect: [0.8, 1.91],
  },
  tiktok: {
    imageBytes: 20 * 1024 * 1024,
    videoBytes: 287 * 1024 * 1024,
    videoSeconds: [3, 600],
    aspect: [0.5, 1.78],
  },
  linkedin: {
    imageBytes: 10 * 1024 * 1024,
    videoBytes: 200 * 1024 * 1024,
    videoSeconds: [3, 600],
    aspect: [0.4, 2.4],
  },
  facebook: {
    imageBytes: 30 * 1024 * 1024,
    videoBytes: 1024 * 1024 * 1024,
    videoSeconds: [1, 14400],
    aspect: [0.25, 4],
  },
};

export class SocialPublisherError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type UploadedMediaFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  arrayBuffer: ArrayBuffer;
};

type CreateScheduledPostInput = {
  companyId: string;
  postType: SocialPostType;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduledAtIso: string;
  mediaFiles: UploadedMediaFile[];
  existingMediaFileIds?: string[];
};

type ListScheduledPostsInput = {
  companyId: string;
  page: number;
  pageSize: number;
  status?: SocialPublishStatus;
  dateFrom?: string;
  dateTo?: string;
};

type ScheduledPostSummary = {
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
  mediaFileIds: string[];
};

type ListScheduledPostsResult = {
  items: Array<
    ScheduledPostSummary & {
      thumbnailUrl: string | null;
      thumbnailType: string | null;
    }
  >;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PublishExecutionResult = {
  scheduledPostId: string;
  companyId: string;
  status: SocialPublishStatus;
  successCount: number;
  failureCount: number;
  externalPostIds: PublishResultMap;
  errorDetails: PublishErrorMap;
};

type UploadPostConfig = {
  apiKey: string;
  baseUrl: string;
  profileId?: string;
};

type StoredMediaRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
};

function normalizeIsoDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function safeJsonObject(value: unknown): Record<string, Json> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, Json> = {};
  for (const [key, current] of Object.entries(value)) {
    if (
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean" ||
      current === null
    ) {
      result[key] = current;
      continue;
    }

    if (Array.isArray(current)) {
      result[key] = current.filter(
        (item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          item === null
      ) as Json;
      continue;
    }

    if (typeof current === "object") {
      result[key] = safeJsonObject(current);
    }
  }

  return result;
}

function parsePlatforms(raw: Json): SocialPlatform[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed = raw.filter((value): value is SocialPlatform => {
    return typeof value === "string" && SUPPORTED_PLATFORMS.has(value as SocialPlatform);
  });

  return Array.from(new Set(parsed));
}

function parseUuidArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is string => typeof item === "string");
}

const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

function isProcessingStale(progress: PublishProgressMap): boolean {
  const timestamps = Object.values(progress)
    .map((item) => item.updatedAt)
    .filter((ts): ts is string => typeof ts === "string");

  if (timestamps.length === 0) {
    return true;
  }

  const mostRecent = Math.max(...timestamps.map((ts) => new Date(ts).getTime()));
  return Date.now() - mostRecent > STALE_PROCESSING_THRESHOLD_MS;
}

function createInitialProgress(platforms: SocialPlatform[]): PublishProgressMap {
  const now = new Date().toISOString();
  const progress: PublishProgressMap = {};
  for (const platform of platforms) {
    progress[platform] = {
      status: "pending",
      updatedAt: now,
    };
  }
  return progress;
}

function ensurePostTypeMediaRules(postType: SocialPostType, mediaFiles: UploadedMediaFile[]) {
  if (postType === "photo") {
    if (mediaFiles.length !== 1) {
      throw new SocialPublisherError(
        "Post do tipo photo exige exatamente 1 imagem.",
        "INVALID_MEDIA_COUNT",
        400
      );
    }

    if (!IMAGE_TYPES.has(mediaFiles[0].fileType)) {
      throw new SocialPublisherError(
        "Post do tipo photo aceita apenas jpg, png ou webp.",
        "INVALID_MEDIA_TYPE",
        400
      );
    }
    return;
  }

  if (postType === "video") {
    if (mediaFiles.length !== 1) {
      throw new SocialPublisherError(
        "Post do tipo video exige exatamente 1 arquivo.",
        "INVALID_MEDIA_COUNT",
        400
      );
    }

    if (!VIDEO_TYPES.has(mediaFiles[0].fileType)) {
      throw new SocialPublisherError(
        "Post do tipo video aceita apenas mp4 ou mov.",
        "INVALID_MEDIA_TYPE",
        400
      );
    }
    return;
  }

  if (mediaFiles.length < 2 || mediaFiles.length > 10) {
    throw new SocialPublisherError(
      "Post do tipo carousel exige entre 2 e 10 imagens.",
      "INVALID_MEDIA_COUNT",
      400
    );
  }

  const invalidImage = mediaFiles.some((media) => !IMAGE_TYPES.has(media.fileType));
  if (invalidImage) {
    throw new SocialPublisherError(
      "Post do tipo carousel aceita apenas imagens jpg, png ou webp.",
      "INVALID_MEDIA_TYPE",
      400
    );
  }
}

type MediaMetadata = {
  fileSize: number;
  fileType: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
}

function validateMediaForPlatforms(
  platforms: SocialPlatform[],
  metas: MediaMetadata[]
) {
  for (const platform of platforms) {
    const limits = PLATFORM_LIMITS[platform];
    for (const meta of metas) {
      const isVideo = meta.fileType.startsWith("video/");
      const maxBytes = isVideo ? limits.videoBytes : limits.imageBytes;

      if (meta.fileSize > maxBytes) {
        throw new SocialPublisherError(
          `Arquivo acima do limite da ${platform}: ${formatBytes(meta.fileSize)} (max ${formatBytes(maxBytes)}).`,
          "INVALID_MEDIA_SIZE",
          400
        );
      }

      if (isVideo && typeof meta.duration === "number" && meta.duration > 0) {
        const [minS, maxS] = limits.videoSeconds;
        if (meta.duration < minS || meta.duration > maxS) {
          throw new SocialPublisherError(
            `Duracao fora do limite da ${platform}: ${Math.round(meta.duration)}s (permitido ${minS}-${maxS}s).`,
            "INVALID_MEDIA_DURATION",
            400
          );
        }
      }

      if (
        typeof meta.width === "number" &&
        typeof meta.height === "number" &&
        meta.width > 0 &&
        meta.height > 0
      ) {
        const aspect = meta.width / meta.height;
        const [minA, maxA] = limits.aspect;
        if (aspect < minA || aspect > maxA) {
          throw new SocialPublisherError(
            `Aspect ratio incompativel com ${platform}: ${aspect.toFixed(2)} (permitido ${minA}-${maxA}).`,
            "INVALID_MEDIA_ASPECT",
            400
          );
        }
      }
    }
  }
}

async function storeMediaFiles(
  companyId: string,
  mediaFiles: UploadedMediaFile[]
): Promise<StoredMediaRow[]> {
  const supabase = createSupabaseAdminClient();

  // Upload ao Cloudinary (unico primario — Supabase Storage removido em 2026-04).
  const cloudinaryResults = await uploadMediaToCloudinary(companyId, mediaFiles);

  const insertRows: Array<Database["public"]["Tables"]["media_files"]["Insert"]> = [];
  for (let i = 0; i < mediaFiles.length; i++) {
    const mediaFile = mediaFiles[i];
    const cloudinaryItem = cloudinaryResults[i];
    if (!cloudinaryItem?.secureUrl) {
      throw new SocialPublisherError(
        "Upload do Cloudinary retornou resultado invalido.",
        "MEDIA_UPLOAD_ERROR",
        500
      );
    }

    insertRows.push({
      company_id: companyId,
      file_name: mediaFile.fileName,
      file_type: mediaFile.fileType,
      file_size: mediaFile.fileSize,
      storage_path: `cloudinary:${cloudinaryItem.publicId}`,
      public_url: cloudinaryItem.secureUrl,
      cloudinary_public_id: cloudinaryItem.publicId,
      cloudinary_format: cloudinaryItem.format ?? null,
      width: cloudinaryItem.width ?? null,
      height: cloudinaryItem.height ?? null,
      duration: cloudinaryItem.duration ?? null,
      resource_type: cloudinaryItem.resourceType ?? null,
      thumbnail_url: cloudinaryItem.thumbnailUrl ?? null,
      tags: [companyId, "social-publisher"],
    });
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("media_files")
    .insert(insertRows)
    .select("id, file_name, file_type, file_size, storage_path, public_url");

  if (insertError) {
    throw new SocialPublisherError(
      "Falha ao registrar arquivos de midia.",
      "MEDIA_REGISTER_ERROR",
      500
    );
  }

  return insertedRows ?? [];
}

function parseProgress(raw: Json | null): PublishProgressMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const result: PublishProgressMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SUPPORTED_PLATFORMS.has(key as SocialPlatform)) {
      continue;
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }

    const candidate = value as Record<string, unknown>;
    const status = candidate.status;
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
      externalPostId:
        typeof candidate.externalPostId === "string" ? candidate.externalPostId : undefined,
      error: typeof candidate.error === "string" ? candidate.error : undefined,
      updatedAt:
        typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    };
  }

  return result;
}

function parseResultMap(raw: Json | null): PublishResultMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const parsed: PublishResultMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SUPPORTED_PLATFORMS.has(key as SocialPlatform) || typeof value !== "string") {
      continue;
    }
    parsed[key as SocialPlatform] = value;
  }
  return parsed;
}

function parseErrorMap(raw: Json | null): PublishErrorMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }

  const parsed: PublishErrorMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SUPPORTED_PLATFORMS.has(key as SocialPlatform) || typeof value !== "string") {
      continue;
    }
    parsed[key as SocialPlatform] = value;
  }
  return parsed;
}

async function getUploadPostConfig(companyId: string): Promise<UploadPostConfig> {
  const supabase = createSupabaseAdminClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("config")
    .eq("company_id", companyId)
    .eq("type", "upload_post")
    .maybeSingle();

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar configuração Upload-Post.",
      "UPLOAD_POST_CONFIG_ERROR",
      500
    );
  }

  const decoded = integration?.config
    ? decodeIntegrationConfig("upload_post", integration.config)
    : {};
  const apiKey = decoded.apiKey || process.env.UPLOAD_POST_API_KEY?.trim();

  if (!apiKey) {
    throw new SocialPublisherError(
      "API key da Upload-Post não configurada no servidor.",
      "UPLOAD_POST_INVALID_CONFIG",
      500
    );
  }

  const baseUrl =
    process.env.UPLOAD_POST_API_URL?.replace(/\/+$/, "") ||
    process.env.UPLOAD_POST_API_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new SocialPublisherError(
      "UPLOAD_POST_API_URL (ou UPLOAD_POST_API_BASE_URL) não configurada no ambiente.",
      "UPLOAD_POST_BASE_URL_MISSING",
      500
    );
  }

  return {
    apiKey,
    baseUrl,
    profileId: decoded.profileId,
  };
}

const UPLOAD_POST_TIMEOUT_MS = 60_000;

async function publishToPlatform(input: {
  companyId: string;
  scheduledPostId: string;
  platform: SocialPlatform;
  postType: SocialPostType;
  caption: string | null;
  mediaUrls: string[];
  config: UploadPostConfig;
}) {
  const config = input.config;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_POST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/publish`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scheduledPostId: input.scheduledPostId,
        companyId: input.companyId,
        profileId: config.profileId ?? null,
        platform: input.platform,
        postType: input.postType,
        caption: input.caption ?? "",
        mediaUrls: input.mediaUrls,
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout ao publicar em ${input.platform} apos ${UPLOAD_POST_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Falha ao publicar em ${input.platform}: ${response.status} ${detail.slice(0, 180)}`
    );
  }

  const payloadUnknown: unknown = await response.json().catch(() => ({}));
  const payload =
    typeof payloadUnknown === "object" && payloadUnknown !== null
      ? (payloadUnknown as Record<string, unknown>)
      : {};

  const externalPostIdCandidate = payload.externalPostId;
  if (typeof externalPostIdCandidate === "string" && externalPostIdCandidate.trim().length > 0) {
    return externalPostIdCandidate;
  }

  const postIdCandidate = payload.postId;
  if (typeof postIdCandidate === "string" && postIdCandidate.trim().length > 0) {
    return postIdCandidate;
  }

  return `${input.platform}-${Date.now()}`;
}

function normalizeScheduledPostSummary(
  row: Database["public"]["Tables"]["scheduled_posts"]["Row"]
): ScheduledPostSummary {
  return {
    id: row.id,
    postType: row.post_type,
    caption: row.caption ?? null,
    platforms: parsePlatforms(row.platforms),
    scheduledAt: row.scheduled_at,
    status: row.status,
    progress: parseProgress(row.progress),
    externalPostIds: parseResultMap(row.external_post_ids),
    errorDetails: parseErrorMap(row.error_details),
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    mediaFileIds: row.media_file_ids,
  };
}

export async function createScheduledPost(input: CreateScheduledPostInput) {
  if (input.platforms.length === 0) {
    throw new SocialPublisherError(
      "Selecione ao menos uma plataforma.",
      "PLATFORMS_REQUIRED",
      400
    );
  }

  let mediaFileIds: string[];

  // Reuso de mídia existente da biblioteca
  if (input.existingMediaFileIds && input.existingMediaFileIds.length > 0) {
    const supabase = createSupabaseAdminClient();
    const { data: existingFiles, error: fetchError } = await supabase
      .from("media_files")
      .select("id, file_type, file_size, width, height, duration")
      .eq("company_id", input.companyId)
      .in("id", input.existingMediaFileIds);

    if (fetchError) {
      throw new SocialPublisherError(
        "Falha ao validar arquivos de mídia existentes.",
        "MEDIA_VALIDATE_ERROR",
        500
      );
    }

    if (!existingFiles || existingFiles.length !== input.existingMediaFileIds.length) {
      throw new SocialPublisherError(
        "Um ou mais arquivos de mídia não foram encontrados para esta empresa.",
        "MEDIA_NOT_FOUND",
        404
      );
    }

    validateMediaForPlatforms(
      input.platforms,
      existingFiles.map((item) => ({
        fileType: item.file_type,
        fileSize: item.file_size,
        width: item.width,
        height: item.height,
        duration: item.duration,
      }))
    );

    mediaFileIds = input.existingMediaFileIds;
  } else {
    ensurePostTypeMediaRules(input.postType, input.mediaFiles);

    // Pre-validacao usando o tamanho em bytes (aspect/duracao so apos upload ao Cloudinary).
    validateMediaForPlatforms(
      input.platforms,
      input.mediaFiles.map((item) => ({
        fileType: item.fileType,
        fileSize: item.fileSize,
      }))
    );

    const storedMediaFiles = await storeMediaFiles(input.companyId, input.mediaFiles);
    if (storedMediaFiles.length === 0) {
      throw new SocialPublisherError(
        "Nenhuma mídia foi salva para o agendamento.",
        "MEDIA_EMPTY",
        400
      );
    }

    mediaFileIds = storedMediaFiles.map((item) => item.id);

    // Apos upload, validamos novamente com metadados (aspect/duracao) do Cloudinary.
    const supabaseMeta = createSupabaseAdminClient();
    const { data: metaRows } = await supabaseMeta
      .from("media_files")
      .select("id, file_type, file_size, width, height, duration")
      .in("id", mediaFileIds);

    if (metaRows && metaRows.length > 0) {
      try {
        validateMediaForPlatforms(
          input.platforms,
          metaRows.map((item) => ({
            fileType: item.file_type,
            fileSize: item.file_size,
            width: item.width,
            height: item.height,
            duration: item.duration,
          }))
        );
      } catch (validationError) {
        // Rollback: remover os media_files recem-criados
        await supabaseMeta.from("media_files").delete().in("id", mediaFileIds);
        throw validationError;
      }
    }
  }

  const supabase = createSupabaseAdminClient();
  const initialProgress = createInitialProgress(input.platforms);
  const scheduledAt = normalizeIsoDate(input.scheduledAtIso);

  const { data: created, error: createError } = await supabase
    .from("scheduled_posts")
    .insert({
      company_id: input.companyId,
      post_type: input.postType,
      media_file_ids: mediaFileIds,
      caption: input.caption,
      platforms: input.platforms,
      scheduled_at: scheduledAt,
      status: "scheduled",
      progress: initialProgress,
      external_post_ids: {},
      error_details: {},
    })
    .select(
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at"
    )
    .single();

  if (createError || !created?.id || !created.company_id) {
    throw new SocialPublisherError(
      "Falha ao criar agendamento do post.",
      "SCHEDULE_CREATE_ERROR",
      500
    );
  }

  // Buscar detalhes dos media files para o retorno
  const { data: mediaRows } = await supabase
    .from("media_files")
    .select("id, file_name, file_type, file_size, public_url, storage_path")
    .in("id", mediaFileIds);

  return {
    scheduledPost: normalizeScheduledPostSummary(created),
    mediaFiles: (mediaRows ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      publicUrl: file.public_url,
      storagePath: file.storage_path,
    })),
  };
}

export async function listScheduledPosts(input: ListScheduledPostsInput): Promise<ListScheduledPostsResult> {
  const supabase = createSupabaseAdminClient();
  const start = (input.page - 1) * input.pageSize;
  const end = start + input.pageSize - 1;

  let query = supabase
    .from("scheduled_posts")
    .select(
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at",
      { count: "exact" }
    )
    .eq("company_id", input.companyId)
    .order("scheduled_at", { ascending: false })
    .range(start, end);

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.dateFrom) {
    query = query.gte("scheduled_at", normalizeIsoDate(input.dateFrom));
  }
  if (input.dateTo) {
    query = query.lte("scheduled_at", normalizeIsoDate(input.dateTo));
  }

  const { data: rows, error, count } = await query;
  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar histórico de agendamentos.",
      "SCHEDULE_HISTORY_ERROR",
      500
    );
  }

  const summaries = (rows ?? []).map((row) => normalizeScheduledPostSummary(row));
  const thumbnailIds = summaries
    .map((summary) => summary.mediaFileIds[0])
    .filter((id): id is string => typeof id === "string");

  let thumbnailMap = new Map<string, { url: string; type: string }>();
  if (thumbnailIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("media_files")
      .select("id, public_url, file_type")
      .in("id", thumbnailIds);

    thumbnailMap = new Map(
      (mediaRows ?? []).map((item) => [item.id, { url: item.public_url, type: item.file_type }])
    );
  }

  const items = summaries.map((summary) => {
    const thumbnail = thumbnailMap.get(summary.mediaFileIds[0] ?? "");
    return {
      ...summary,
      thumbnailUrl: thumbnail?.url ?? null,
      thumbnailType: thumbnail?.type ?? null,
    };
  });

  const total = count ?? 0;
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function cancelScheduledPost(companyId: string, scheduledPostId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .select("id, company_id, status")
    .eq("id", scheduledPostId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar agendamento para cancelamento.",
      "SCHEDULE_FETCH_ERROR",
      500
    );
  }

  if (!row?.id) {
    throw new SocialPublisherError(
      "Agendamento não encontrado para esta empresa.",
      "SCHEDULE_NOT_FOUND",
      404
    );
  }

  if (row.status !== "scheduled") {
    throw new SocialPublisherError(
      "Somente posts com status scheduled podem ser cancelados.",
      "INVALID_SCHEDULE_STATUS",
      409
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_posts")
    .update({
      status: "cancelled",
      error_details: {
        cancelledAt: new Date().toISOString(),
      },
    })
    .eq("id", row.id)
    .eq("company_id", companyId)
    .select(
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at"
    )
    .single();

  if (updateError || !updated) {
    throw new SocialPublisherError(
      "Falha ao atualizar status para cancelled.",
      "SCHEDULE_CANCEL_ERROR",
      500
    );
  }

  return normalizeScheduledPostSummary(updated);
}

export async function publishScheduledPost(input: {
  scheduledPostId: string;
  expectedCompanyId?: string;
}): Promise<PublishExecutionResult> {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .select(
      "id, company_id, post_type, caption, media_file_ids, platforms, status, progress, external_post_ids, error_details, published_at, attempt_count"
    )
    .eq("id", input.scheduledPostId)
    .maybeSingle();

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar agendamento para publicação.",
      "PUBLISH_FETCH_ERROR",
      500
    );
  }

  if (!row?.id || !row.company_id) {
    throw new SocialPublisherError(
      "Agendamento não encontrado.",
      "SCHEDULE_NOT_FOUND",
      404
    );
  }

  if (input.expectedCompanyId && input.expectedCompanyId !== row.company_id) {
    throw new SocialPublisherError(
      "company_id do payload não corresponde ao agendamento.",
      "COMPANY_MISMATCH",
      403
    );
  }

  if (row.status === "cancelled") {
    return {
      scheduledPostId: row.id,
      companyId: row.company_id,
      status: "cancelled",
      successCount: 0,
      failureCount: 0,
      externalPostIds: parseResultMap(row.external_post_ids),
      errorDetails: parseErrorMap(row.error_details),
    };
  }

  if (row.status === "published" || row.status === "partial" || row.status === "failed") {
    const previousResults = parseResultMap(row.external_post_ids);
    const previousErrors = parseErrorMap(row.error_details);
    return {
      scheduledPostId: row.id,
      companyId: row.company_id,
      status: row.status,
      successCount: Object.keys(previousResults).length,
      failureCount: Object.keys(previousErrors).length,
      externalPostIds: previousResults,
      errorDetails: previousErrors,
    };
  }

  if (row.status === "processing") {
    const existingProgress = parseProgress(row.progress);

    if (!isProcessingStale(existingProgress)) {
      // Publicação em andamento recente — não interferir
      return {
        scheduledPostId: row.id,
        companyId: row.company_id,
        status: "processing",
        successCount: 0,
        failureCount: 0,
        externalPostIds: parseResultMap(row.external_post_ids),
        errorDetails: parseErrorMap(row.error_details),
      };
    }

    // Processing travado (>5min) — retomar via optimistic lock
    console.warn(
      `[SocialPublisher] Post ${row.id} travado em processing — retomando publicação.`
    );
  }

  // Optimistic lock: status "scheduled" → "processing" (normal)
  // ou "processing" → "processing" com updated_at atualizado (retry de post travado)
  const lockFromStatus = row.status === "processing" ? "processing" : "scheduled";

  const { data: processingRow, error: processingError } = await supabase
    .from("scheduled_posts")
    .update({
      status: "processing",
    })
    .eq("id", row.id)
    .eq("company_id", row.company_id)
    .eq("status", lockFromStatus)
    .select(
      "id, company_id, post_type, caption, media_file_ids, platforms, status, progress, external_post_ids, error_details, published_at"
    )
    .maybeSingle();

  if (processingError) {
    throw new SocialPublisherError(
      "Falha ao iniciar processamento do post.",
      "PUBLISH_START_ERROR",
      500
    );
  }

  if (!processingRow?.id || !processingRow.company_id) {
    return {
      scheduledPostId: row.id,
      companyId: row.company_id,
      status: "processing",
      successCount: 0,
      failureCount: 0,
      externalPostIds: parseResultMap(row.external_post_ids),
      errorDetails: parseErrorMap(row.error_details),
    };
  }

  const processingCompanyId = processingRow.company_id;
  const processingPostId = processingRow.id;

  const platforms = parsePlatforms(processingRow.platforms);
  if (platforms.length === 0) {
    throw new SocialPublisherError(
      "Post sem plataformas para publicação.",
      "PUBLISH_PLATFORMS_EMPTY",
      400
    );
  }

  const mediaIds = parseUuidArray(processingRow.media_file_ids);
  if (mediaIds.length === 0) {
    throw new SocialPublisherError(
      "Post sem arquivos de mídia vinculados.",
      "PUBLISH_MEDIA_EMPTY",
      400
    );
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("media_files")
    .select("id, public_url")
    .in("id", mediaIds)
    .eq("company_id", processingCompanyId);

  if (mediaError) {
    throw new SocialPublisherError(
      "Falha ao carregar arquivos de mídia para publicação.",
      "PUBLISH_MEDIA_FETCH_ERROR",
      500
    );
  }

  const mediaMap = new Map((mediaRows ?? []).map((media) => [media.id, media.public_url]));
  const mediaUrls = mediaIds.map((mediaId) => mediaMap.get(mediaId)).filter((url): url is string => Boolean(url));
  if (mediaUrls.length === 0) {
    throw new SocialPublisherError(
      "Não foi possível resolver URLs públicas das mídias.",
      "PUBLISH_MEDIA_URL_ERROR",
      500
    );
  }

  const progress: PublishProgressMap = {
    ...createInitialProgress(platforms),
    ...parseProgress(processingRow.progress),
  };
  const externalPostIds: PublishResultMap = parseResultMap(processingRow.external_post_ids);
  const errorDetails: PublishErrorMap = parseErrorMap(processingRow.error_details);

  const updateProgressRow = async () => {
    await supabase
      .from("scheduled_posts")
      .update({
        progress: progress,
        external_post_ids: externalPostIds,
        error_details: errorDetails,
      })
      .eq("id", processingPostId)
      .eq("company_id", processingCompanyId);
  };

  const uploadPostConfig = await getUploadPostConfig(processingCompanyId);

  let successCount = 0;
  let failureCount = 0;

  for (const platform of platforms) {
    // Pular plataformas já publicadas com sucesso (retry de post travado)
    if (progress[platform]?.status === "ok") {
      successCount += 1;
      continue;
    }

    const processingProgress: PlatformProgressItem = {
      status: "processing",
      updatedAt: new Date().toISOString(),
    };
    progress[platform] = processingProgress;
    await updateProgressRow();

    try {
      const externalPostId = await publishToPlatform({
        companyId: processingCompanyId,
        scheduledPostId: processingPostId,
        platform,
        postType: processingRow.post_type,
        caption: processingRow.caption,
        mediaUrls,
        config: uploadPostConfig,
      });

      externalPostIds[platform] = externalPostId;
      progress[platform] = {
        status: "ok",
        externalPostId,
        updatedAt: new Date().toISOString(),
      };
      successCount += 1;
      delete errorDetails[platform];
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado na publicação.";
      errorDetails[platform] = detail;
      progress[platform] = {
        status: "error",
        error: detail,
        updatedAt: new Date().toISOString(),
      };
      failureCount += 1;
    }

    await updateProgressRow();
  }

  let finalStatus: SocialPublishStatus =
    successCount === platforms.length
      ? "published"
      : successCount > 0
        ? "partial"
        : "failed";

  // Retry local (sem QStash): em falha total, reagendar com backoff ate 3 tentativas.
  const currentAttempt = typeof row.attempt_count === "number" ? row.attempt_count : 0;
  const nextAttempt = currentAttempt + 1;
  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];

  let retryScheduledAt: string | null = null;
  if (finalStatus === "failed" && nextAttempt < MAX_ATTEMPTS) {
    const delay = BACKOFF_MS[nextAttempt - 1] ?? 60_000;
    retryScheduledAt = new Date(Date.now() + delay).toISOString();
    finalStatus = "scheduled";
    console.warn("[social-publisher] retry scheduled", {
      scheduledPostId: processingPostId,
      attempt: nextAttempt,
      maxAttempts: MAX_ATTEMPTS,
      nextRunAt: retryScheduledAt,
      errors: errorDetails,
    });
  } else if (finalStatus === "failed") {
    console.error("[social-publisher] retries esgotados", {
      scheduledPostId: processingPostId,
      attempts: nextAttempt,
      errors: errorDetails,
    });
  }

  const nowIso = new Date().toISOString();
  const finalizeUpdate: Database["public"]["Tables"]["scheduled_posts"]["Update"] = {
    status: finalStatus,
    progress: progress,
    external_post_ids: externalPostIds,
    error_details: errorDetails,
    published_at: successCount > 0 ? nowIso : null,
    attempt_count: nextAttempt,
  };
  if (retryScheduledAt) {
    finalizeUpdate.scheduled_at = retryScheduledAt;
  }

  const { error: finalizeError } = await supabase
    .from("scheduled_posts")
    .update(finalizeUpdate)
    .eq("id", processingPostId)
    .eq("company_id", processingCompanyId);

  if (finalizeError) {
    throw new SocialPublisherError(
      "Falha ao finalizar status da publicação.",
      "PUBLISH_FINALIZE_ERROR",
      500
    );
  }

  // --- Alerta para posts com falha (fire-and-forget) ---
  if (finalStatus === "failed" || finalStatus === "partial") {
    const errorSummary = Object.entries(errorDetails)
      .map(([platform, detail]) => `${platform}: ${detail}`)
      .join("; ")
      .slice(0, 300);

    triggerFailedPostAlert({
      companyId: processingCompanyId,
      scheduledPostId: processingPostId,
      caption: processingRow.caption,
      platforms: platforms,
      errorSummary,
    });
  }

  return {
    scheduledPostId: processingPostId,
    companyId: processingCompanyId,
    status: finalStatus,
    successCount,
    failureCount,
    externalPostIds: externalPostIds,
    errorDetails: errorDetails,
  };
}

export function parseSocialStatus(value?: string | null): SocialPublishStatus | undefined {
  if (
    value === "scheduled" ||
    value === "processing" ||
    value === "published" ||
    value === "partial" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return undefined;
}

export function parseJsonObject(value: Json | null) {
  return safeJsonObject(value);
}

type ListPostsByMonthInput = {
  companyId: string;
  year: number;
  month: number; // 1-indexed
  platforms?: SocialPlatform[];
  status?: SocialPublishStatus;
};

type CalendarPostItem = {
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

export async function listPostsByMonth(
  input: ListPostsByMonthInput
): Promise<CalendarPostItem[]> {
  const supabase = createSupabaseAdminClient();

  const startOfMonth = new Date(Date.UTC(input.year, input.month - 1, 1)).toISOString();
  const endOfMonth = new Date(Date.UTC(input.year, input.month, 0, 23, 59, 59, 999)).toISOString();

  let query = supabase
    .from("scheduled_posts")
    .select(
      "id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress"
    )
    .eq("company_id", input.companyId)
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar posts do mês.",
      "CALENDAR_FETCH_ERROR",
      500
    );
  }

  let items = (rows ?? []).map((row) => ({
    id: row.id,
    postType: row.post_type,
    caption: row.caption ?? null,
    platforms: parsePlatforms(row.platforms),
    scheduledAt: row.scheduled_at,
    status: row.status,
    progress: parseProgress(row.progress),
    mediaFileIds: row.media_file_ids,
  }));

  if (input.platforms && input.platforms.length > 0) {
    items = items.filter((item) =>
      item.platforms.some((p) => input.platforms!.includes(p))
    );
  }

  // Resolve thumbnails
  const thumbnailIds = items
    .map((item) => item.mediaFileIds[0])
    .filter((id): id is string => typeof id === "string");

  let thumbnailMap = new Map<string, string>();
  if (thumbnailIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("media_files")
      .select("id, public_url")
      .in("id", thumbnailIds);

    thumbnailMap = new Map(
      (mediaRows ?? []).map((m) => [m.id, m.public_url])
    );
  }

  return items.map((item) => ({
    ...item,
    thumbnailUrl: thumbnailMap.get(item.mediaFileIds[0] ?? "") ?? null,
  }));
}

type ReschedulePostInput = {
  companyId: string;
  scheduledPostId: string;
  newScheduledAtIso: string;
};

export async function reschedulePost(input: ReschedulePostInput) {
  const supabase = createSupabaseAdminClient();

  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .select("id, company_id, status, scheduled_at")
    .eq("id", input.scheduledPostId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (error || !row?.id) {
    throw new SocialPublisherError(
      "Agendamento não encontrado.",
      "SCHEDULE_NOT_FOUND",
      404
    );
  }

  if (row.status !== "scheduled") {
    throw new SocialPublisherError(
      "Somente posts com status 'scheduled' podem ser reagendados.",
      "INVALID_SCHEDULE_STATUS",
      409
    );
  }

  const newDate = new Date(input.newScheduledAtIso);
  if (Number.isNaN(newDate.getTime()) || newDate.getTime() < Date.now()) {
    throw new SocialPublisherError(
      "Nova data deve ser no futuro.",
      "INVALID_RESCHEDULE_DATE",
      400
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_posts")
    .update({
      scheduled_at: newDate.toISOString(),
      attempt_count: 0,
    })
    .eq("id", row.id)
    .eq("company_id", input.companyId)
    .select(
      "id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at"
    )
    .single();

  if (updateError || !updated) {
    throw new SocialPublisherError(
      "Falha ao reagendar post.",
      "RESCHEDULE_ERROR",
      500
    );
  }

  return normalizeScheduledPostSummary({
    ...updated,
    company_id: input.companyId,
  });
}

type RetryScheduledPostInput = {
  companyId: string;
  scheduledPostId: string;
};

/**
 * Reenfileira um post em status `failed` ou `partial` para ser publicado imediatamente pelo poller.
 * Mantem o `progress` para pular plataformas ja publicadas com sucesso.
 */
export async function retryScheduledPost(input: RetryScheduledPostInput) {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .select("id, company_id, status")
    .eq("id", input.scheduledPostId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (error || !row?.id) {
    throw new SocialPublisherError(
      "Agendamento nao encontrado.",
      "SCHEDULE_NOT_FOUND",
      404
    );
  }

  if (row.status !== "failed" && row.status !== "partial") {
    throw new SocialPublisherError(
      "Apenas posts com status failed ou partial podem ser reexecutados.",
      "INVALID_RETRY_STATUS",
      409
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_posts")
    .update({
      status: "scheduled",
      scheduled_at: new Date().toISOString(),
      attempt_count: 0,
    })
    .eq("id", row.id)
    .eq("company_id", input.companyId)
    .select(
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at"
    )
    .single();

  if (updateError || !updated) {
    throw new SocialPublisherError(
      "Falha ao reexecutar post.",
      "RETRY_ERROR",
      500
    );
  }

  return normalizeScheduledPostSummary(updated);
}

type UpdateScheduledPostInput = {
  companyId: string;
  scheduledPostId: string;
  caption?: string | null;
  platforms?: SocialPlatform[];
};

/**
 * Edita metadados leves (caption, platforms) de um post agendado.
 * Somente posts com status `scheduled` podem ser editados.
 */
export async function updateScheduledPost(input: UpdateScheduledPostInput) {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .select("id, company_id, status, media_file_ids")
    .eq("id", input.scheduledPostId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (error || !row?.id) {
    throw new SocialPublisherError(
      "Agendamento nao encontrado.",
      "SCHEDULE_NOT_FOUND",
      404
    );
  }

  if (row.status !== "scheduled") {
    throw new SocialPublisherError(
      "Somente posts com status scheduled podem ser editados.",
      "INVALID_EDIT_STATUS",
      409
    );
  }

  const update: Database["public"]["Tables"]["scheduled_posts"]["Update"] = {};
  if (typeof input.caption === "string" || input.caption === null) {
    update.caption = input.caption;
  }
  if (input.platforms && input.platforms.length > 0) {
    const unique = Array.from(new Set(input.platforms)).filter((p) =>
      SUPPORTED_PLATFORMS.has(p)
    );
    if (unique.length === 0) {
      throw new SocialPublisherError(
        "Selecione ao menos uma plataforma valida.",
        "PLATFORMS_REQUIRED",
        400
      );
    }
    update.platforms = unique as unknown as Json;
    // Revalida regras de midia contra as novas plataformas
    const mediaIds = parseUuidArray(row.media_file_ids);
    if (mediaIds.length > 0) {
      const { data: mediaMeta } = await supabase
        .from("media_files")
        .select("file_type, file_size, width, height, duration")
        .in("id", mediaIds);
      if (mediaMeta && mediaMeta.length > 0) {
        validateMediaForPlatforms(
          unique,
          mediaMeta.map((item) => ({
            fileType: item.file_type,
            fileSize: item.file_size,
            width: item.width,
            height: item.height,
            duration: item.duration,
          }))
        );
      }
    }
    // Reseta progress para as novas plataformas
    update.progress = createInitialProgress(unique);
  }

  if (Object.keys(update).length === 0) {
    throw new SocialPublisherError(
      "Nenhum campo para atualizar.",
      "NO_UPDATE_FIELDS",
      400
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("scheduled_posts")
    .update(update)
    .eq("id", row.id)
    .eq("company_id", input.companyId)
    .select(
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, attempt_count, updated_at, created_at"
    )
    .single();

  if (updateError || !updated) {
    throw new SocialPublisherError(
      "Falha ao atualizar agendamento.",
      "UPDATE_ERROR",
      500
    );
  }

  return normalizeScheduledPostSummary(updated);
}
