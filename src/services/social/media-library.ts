/**
 * Arquivo: src/services/social/media-library.ts
 * Proposito: Servico de biblioteca de midia com CRUD e integracao Cloudinary.
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

const MEDIA_FILE_COLUMNS =
  "id, company_id, file_name, file_type, file_size, public_url, storage_path, cloudinary_public_id, cloudinary_format, width, height, duration, resource_type, thumbnail_url, tags, created_at" as const;

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
      "Falha ao carregar biblioteca de midia.",
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
      "Falha ao carregar arquivo de midia.",
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
      "Falha ao carregar arquivos de midia por IDs.",
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
  const supabase = createSupabaseAdminClient();

  // Verificar se existe
  const { data: row, error: fetchError } = await supabase
    .from("media_files")
    .select("id, cloudinary_public_id, resource_type")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError || !row) {
    throw new SocialPublisherError(
      "Arquivo de midia nao encontrado.",
      "MEDIA_NOT_FOUND",
      404
    );
  }

  // Verificar se esta em uso em scheduled_posts
  const { data: usedInPosts } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("company_id", companyId)
    .contains("media_file_ids", [id])
    .limit(1);

  if (usedInPosts && usedInPosts.length > 0) {
    throw new SocialPublisherError(
      "Arquivo em uso em posts agendados. Remova-o dos posts antes de deletar.",
      "MEDIA_IN_USE",
      409
    );
  }

  // Verificar se esta em uso em content_demands
  const { data: usedInDemands } = await supabase
    .from("content_demands")
    .select("id")
    .eq("company_id", companyId)
    .contains("media_file_ids", [id])
    .limit(1);

  if (usedInDemands && usedInDemands.length > 0) {
    throw new SocialPublisherError(
      "Arquivo em uso em demandas de conteudo. Remova-o das demandas antes de deletar.",
      "MEDIA_IN_USE",
      409
    );
  }

  // Deletar do Cloudinary
  if (row.cloudinary_public_id) {
    try {
      await deleteFromCloudinary(row.cloudinary_public_id, row.resource_type ?? "image");
    } catch (error) {
      console.error("[MediaLibrary] Falha ao deletar do Cloudinary:", error);
    }
  }

  // Deletar do banco
  const { error: deleteError } = await supabase
    .from("media_files")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (deleteError) {
    throw new SocialPublisherError(
      "Falha ao deletar arquivo de midia.",
      "MEDIA_DELETE_ERROR",
      500
    );
  }
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
