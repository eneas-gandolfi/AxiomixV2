/**
 * Arquivo: src/services/social/media-library.ts
 * Propósito: Serviço de biblioteca de mídia com CRUD e integração Cloudinary.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import type { Database } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteFromCloudinary } from "@/services/social/cloudinary-upload";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";
import { SocialPublisherError } from "@/services/social/publisher";

type MediaFileRow = Database["public"]["Tables"]["media_files"]["Row"];
type MediaUsageRow = Pick<
  Database["public"]["Tables"]["scheduled_posts"]["Row"],
  "media_file_ids"
>;

const MEDIA_FILE_COLUMNS =
  "id, company_id, file_name, file_type, file_size, public_url, storage_path, cloudinary_public_id, cloudinary_format, width, height, duration, resource_type, thumbnail_url, tags, created_at" as const;
const MEDIA_BUCKET = "Axiomix - v2";

export type MediaDeleteBlockedReason = "scheduled_post" | "content_demand";

export type DeleteMediaFilesResult = {
  deletedIds: string[];
  blocked: Array<{
    id: string;
    fileName: string;
    reason: MediaDeleteBlockedReason;
  }>;
  missingIds: string[];
};

type ListMediaFilesInput = {
  companyId: string;
  page: number;
  pageSize: number;
  search?: string;
  fileType?: "image" | "video";
  tags?: string[];
};

type ListMediaFilesResult = {
  items: MediaLibraryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toMediaLibraryItem(
  row: Database["public"]["Tables"]["media_files"]["Row"]
): MediaLibraryItem {
  return {
    id: row.id,
    companyId: row.company_id ?? "",
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    publicUrl: row.public_url,
    cloudinaryPublicId: row.cloudinary_public_id ?? null,
    cloudinaryFormat: row.cloudinary_format ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    duration: row.duration ?? null,
    resourceType: row.resource_type ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    tags: row.tags ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function collectBlockedIds(
  rows: MediaUsageRow[] | null,
  requestedIds: Set<string>,
  blocked: Map<string, MediaDeleteBlockedReason>,
  reason: MediaDeleteBlockedReason
) {
  for (const row of rows ?? []) {
    for (const mediaId of row.media_file_ids ?? []) {
      if (requestedIds.has(mediaId) && !blocked.has(mediaId)) {
        blocked.set(mediaId, reason);
      }
    }
  }
}

async function getBlockedMediaIds(
  companyId: string,
  ids: string[]
): Promise<Map<string, MediaDeleteBlockedReason>> {
  const supabase = createSupabaseAdminClient();
  const requestedIds = new Set(ids);

  const [{ data: scheduledRows, error: scheduledError }, { data: demandRows, error: demandError }] =
    await Promise.all([
      supabase
        .from("scheduled_posts")
        .select("media_file_ids")
        .eq("company_id", companyId)
        .overlaps("media_file_ids", ids),
      supabase
        .from("content_demands")
        .select("media_file_ids")
        .eq("company_id", companyId)
        .overlaps("media_file_ids", ids),
    ]);

  if (scheduledError || demandError) {
    throw new SocialPublisherError(
      "Falha ao verificar uso dos arquivos de mídia.",
      "MEDIA_USAGE_CHECK_ERROR",
      500
    );
  }

  const blocked = new Map<string, MediaDeleteBlockedReason>();
  collectBlockedIds(scheduledRows, requestedIds, blocked, "scheduled_post");
  collectBlockedIds(demandRows, requestedIds, blocked, "content_demand");

  return blocked;
}

export async function listMediaFiles(
  input: ListMediaFilesInput
): Promise<ListMediaFilesResult> {
  const supabase = createSupabaseAdminClient();
  const start = (input.page - 1) * input.pageSize;
  const end = start + input.pageSize - 1;

  let query = supabase
    .from("media_files")
    .select(MEDIA_FILE_COLUMNS, { count: "exact" })
    .eq("company_id", input.companyId)
    .order("created_at", { ascending: false })
    .range(start, end);

  if (input.search) {
    query = query.ilike("file_name", `%${input.search}%`);
  }

  if (input.fileType === "image") {
    query = query.in("file_type", ["image/jpeg", "image/png", "image/webp"]);
  } else if (input.fileType === "video") {
    query = query.in("file_type", ["video/mp4", "video/quicktime"]);
  }

  if (input.tags && input.tags.length > 0) {
    query = query.overlaps("tags", input.tags);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar biblioteca de mídia.",
      "MEDIA_LIBRARY_LIST_ERROR",
      500
    );
  }

  const total = count ?? 0;
  return {
    items: (rows ?? []).map(toMediaLibraryItem),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getMediaFile(
  companyId: string,
  id: string
): Promise<MediaLibraryItem | null> {
  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("media_files")
    .select(MEDIA_FILE_COLUMNS)
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar arquivo de mídia.",
      "MEDIA_LIBRARY_GET_ERROR",
      500
    );
  }

  if (!row) return null;
  return toMediaLibraryItem(row);
}

export async function getMediaFilesByIds(
  companyId: string,
  ids: string[]
): Promise<MediaLibraryItem[]> {
  if (ids.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("media_files")
    .select(MEDIA_FILE_COLUMNS)
    .eq("company_id", companyId)
    .in("id", ids);

  if (error) {
    throw new SocialPublisherError(
      "Falha ao carregar arquivos de mídia por IDs.",
      "MEDIA_LIBRARY_BATCH_ERROR",
      500
    );
  }

  return (rows ?? []).map(toMediaLibraryItem);
}

export async function deleteMediaFile(
  companyId: string,
  id: string
): Promise<void> {
  const result = await deleteMediaFiles(companyId, [id]);

  if (result.missingIds.includes(id)) {
    throw new SocialPublisherError(
      "Arquivo de mídia não encontrado.",
      "MEDIA_NOT_FOUND",
      404
    );
  }

  const blockedItem = result.blocked.find((item) => item.id === id);
  if (!blockedItem) {
    return;
  }

  if (blockedItem.reason === "content_demand") {
    throw new SocialPublisherError(
      "Arquivo em uso em demandas de conteúdo. Remova-o das demandas antes de deletar.",
      "MEDIA_IN_USE",
      409
    );
  }

  throw new SocialPublisherError(
    "Arquivo em uso em posts agendados. Remova-o dos posts antes de deletar.",
    "MEDIA_IN_USE",
    409
  );
}

export async function deleteMediaFiles(
  companyId: string,
  ids: string[]
): Promise<DeleteMediaFilesResult> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return {
      deletedIds: [],
      blocked: [],
      missingIds: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: rows, error: fetchError } = await supabase
    .from("media_files")
    .select("id, file_name, storage_path, cloudinary_public_id, resource_type")
    .eq("company_id", companyId)
    .in("id", uniqueIds);

  if (fetchError) {
    throw new SocialPublisherError(
      "Falha ao carregar arquivos de mídia para exclusão.",
      "MEDIA_DELETE_FETCH_ERROR",
      500
    );
  }

  const rowMap = new Map((rows ?? []).map((row) => [row.id, row]));
  const missingIds = uniqueIds.filter((id) => !rowMap.has(id));
  const blockedMap = await getBlockedMediaIds(companyId, uniqueIds);

  const blocked = uniqueIds
    .map((id) => {
      const row = rowMap.get(id);
      const reason = blockedMap.get(id);

      if (!row || !reason) {
        return null;
      }

      return {
        id,
        fileName: row.file_name,
        reason,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const deletableRows = (rows ?? []).filter((row) => !blockedMap.has(row.id));
  if (deletableRows.length === 0) {
    return {
      deletedIds: [],
      blocked,
      missingIds,
    };
  }

  const storagePaths = deletableRows
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(storagePaths);

    if (storageError) {
      throw new SocialPublisherError(
        "Falha ao remover arquivos do bucket de armazenamento.",
        "MEDIA_STORAGE_DELETE_ERROR",
        500
      );
    }
  }

  const cloudinaryResults = await Promise.allSettled(
    deletableRows
      .filter((row) => Boolean(row.cloudinary_public_id))
      .map((row) =>
        deleteFromCloudinary(row.cloudinary_public_id ?? "", row.resource_type ?? "image")
      )
  );

  for (const result of cloudinaryResults) {
    if (result.status === "rejected") {
      console.error("[MediaLibrary] Falha ao deletar do Cloudinary:", result.reason);
    }
  }

  const deletableIds = deletableRows.map((row) => row.id);
  const { error: deleteError } = await supabase
    .from("media_files")
    .delete()
    .eq("company_id", companyId)
    .in("id", deletableIds);

  if (deleteError) {
    throw new SocialPublisherError(
      "Falha ao deletar arquivo de mídia.",
      "MEDIA_DELETE_ERROR",
      500
    );
  }

  return {
    deletedIds: deletableIds,
    blocked,
    missingIds,
  };
}

export async function updateMediaFileTags(
  companyId: string,
  id: string,
  tags: string[]
): Promise<MediaLibraryItem> {
  const supabase = createSupabaseAdminClient();

  const { data: updated, error } = await supabase
    .from("media_files")
    .update({ tags })
    .eq("id", id)
    .eq("company_id", companyId)
    .select(MEDIA_FILE_COLUMNS)
    .single();

  if (error || !updated) {
    throw new SocialPublisherError(
      "Falha ao atualizar tags do arquivo.",
      "MEDIA_TAGS_UPDATE_ERROR",
      500
    );
  }

  return toMediaLibraryItem(updated);
}
