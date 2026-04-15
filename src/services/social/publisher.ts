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

const MEDIA_BUCKET = "Axiomix - v2";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const SUPPORTED_PLATFORMS = new Set<SocialPlatform>(["instagram", "linkedin", "tiktok", "facebook"]);

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
  qstashMessageId: string | null;
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

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
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

async function ensureStorageBucket() {
  const supabase = createSupabaseAdminClient();
  const { data: existingBucket } = await supabase.storage.getBucket(MEDIA_BUCKET);

  if (existingBucket?.name) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: 60 * 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new SocialPublisherError(
      "Falha ao preparar bucket de mídia.",
      "MEDIA_BUCKET_ERROR",
      500
    );
  }
}

async function storeMediaFiles(
  companyId: string,
  mediaFiles: UploadedMediaFile[]
): Promise<StoredMediaRow[]> {
  await ensureStorageBucket();
  const supabase = createSupabaseAdminClient();

  // 1. Upload ao Supabase Storage (backup)
  const supabaseResults: Array<{ storagePath: string; publicUrl: string }> = [];
  for (const mediaFile of mediaFiles) {
    const timestampPrefix = new Date().toISOString().slice(0, 10);
    const safeName = sanitizeFileName(mediaFile.fileName);
    const storagePath = `${companyId}/${timestampPrefix}/${crypto.randomUUID()}-${safeName}`;
    const uploadBuffer = Buffer.from(mediaFile.arrayBuffer);

    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, uploadBuffer, {
      contentType: mediaFile.fileType,
      upsert: false,
    });

    if (uploadError) {
      throw new SocialPublisherError(
        "Falha ao enviar arquivo para o Storage.",
        "MEDIA_UPLOAD_ERROR",
        500
      );
    }

    const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
    supabaseResults.push({ storagePath, publicUrl: publicUrlData.publicUrl });
  }

  // 2. Upload ao Cloudinary (primário — CDN)
  let cloudinaryResults: Awaited<ReturnType<typeof uploadMediaToCloudinary>> | null = null;
  try {
    cloudinaryResults = await uploadMediaToCloudinary(companyId, mediaFiles);
  } catch (error) {
    console.error("[SocialPublisher] Cloudinary upload falhou, usando Supabase como fallback:", error);
  }

  // 3. Inserir no banco — Cloudinary como public_url primária, Supabase como backup
  const insertRows: Array<Database["public"]["Tables"]["media_files"]["Insert"]> = [];
  for (let i = 0; i < mediaFiles.length; i++) {
    const mediaFile = mediaFiles[i];
    const supabaseItem = supabaseResults[i];
    const cloudinaryItem = cloudinaryResults?.[i];

    insertRows.push({
      company_id: companyId,
      file_name: mediaFile.fileName,
      file_type: mediaFile.fileType,
      file_size: mediaFile.fileSize,
      storage_path: supabaseItem.storagePath,
      public_url: cloudinaryItem?.secureUrl ?? supabaseItem.publicUrl,
      cloudinary_public_id: cloudinaryItem?.publicId ?? null,
      cloudinary_format: cloudinaryItem?.format ?? null,
      width: cloudinaryItem?.width ?? null,
      height: cloudinaryItem?.height ?? null,
      duration: cloudinaryItem?.duration ?? null,
      resource_type: cloudinaryItem?.resourceType ?? null,
      thumbnail_url: cloudinaryItem?.thumbnailUrl ?? null,
      tags: [companyId, "social-publisher"],
    });
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("media_files")
    .insert(insertRows)
    .select("id, file_name, file_type, file_size, storage_path, public_url");

  if (insertError) {
    throw new SocialPublisherError(
      "Falha ao registrar arquivos de mídia.",
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
  const response = await fetch(`${config.baseUrl}/publish`, {
    method: "POST",
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
    qstashMessageId: row.qstash_message_id ?? null,
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
      .select("id")
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

    mediaFileIds = input.existingMediaFileIds;
  } else {
    ensurePostTypeMediaRules(input.postType, input.mediaFiles);

    const storedMediaFiles = await storeMediaFiles(input.companyId, input.mediaFiles);
    if (storedMediaFiles.length === 0) {
      throw new SocialPublisherError(
        "Nenhuma mídia foi salva para o agendamento.",
        "MEDIA_EMPTY",
        400
      );
    }

    mediaFileIds = storedMediaFiles.map((item) => item.id);
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
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, qstash_message_id, attempt_count, created_at"
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
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, qstash_message_id, attempt_count, created_at",
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
      "id, company_id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, qstash_message_id, attempt_count, created_at"
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
      "id, post_type, media_file_ids, caption, platforms, scheduled_at, status, progress, external_post_ids, error_details, published_at, qstash_message_id, attempt_count, created_at"
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
