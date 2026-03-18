/**
 * Arquivo: src/app/api/social/media-library/route.ts
 * Proposito: Listar e fazer upload de midias na biblioteca do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { deleteMediaFiles, listMediaFiles } from "@/services/social/media-library";
import { SocialPublisherError, type UploadedMediaFile } from "@/services/social/publisher";
import { uploadMediaToCloudinary } from "@/services/social/cloudinary-upload";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/database/types/database.types";

export const dynamic = "force-dynamic";

const MEDIA_BUCKET = "Axiomix - v2";

const querySchema = z.object({
  companyId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().optional(),
  fileType: z.enum(["image", "video"]).optional(),
});

const deleteSchema = z.object({
  companyId: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof SocialPublisherError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "MEDIA_LIBRARY_ERROR" }, { status: 500 });
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureMediaBucketExists() {
  const adminSupabase = createSupabaseAdminClient();
  const { data: existingBucket } = await adminSupabase.storage.getBucket(MEDIA_BUCKET);

  if (existingBucket?.name) {
    return;
  }

  const { error: createError } = await adminSupabase.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: 60 * 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new SocialPublisherError(
      "Falha ao preparar bucket de midia.",
      "MEDIA_BUCKET_ERROR",
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const parsed = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? 1,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? 24,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      fileType: request.nextUrl.searchParams.get("fileType") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Query invalida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const result = await listMediaFiles({
      companyId: access.companyId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
      fileType: parsed.data.fileType,
    });

    return NextResponse.json({ companyId: access.companyId, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const formData = await request.formData();

    const rawCompanyId = formData.get("companyId");
    const companyId = typeof rawCompanyId === "string" ? rawCompanyId : undefined;

    const access = await resolveCompanyAccess(supabase, companyId);

    // Parsear e validar arquivos
    const ALLOWED_MEDIA_TYPES = new Set([
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm",
    ]);
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
    const MAX_FILES_PER_REQUEST = 20;

    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado.", code: "MEDIA_REQUIRED" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximo de ${MAX_FILES_PER_REQUEST} arquivos por requisicao.`, code: "TOO_MANY_FILES" },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo nao permitido: ${file.type}. Aceitos: imagens (JPEG, PNG, WebP, GIF) e videos (MP4, MOV, WebM).`, code: "INVALID_FILE_TYPE" },
          { status: 400 }
        );
      }
      const maxSize = file.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `Arquivo "${file.name}" excede o limite de ${maxSize / (1024 * 1024)} MB.`, code: "FILE_TOO_LARGE" },
          { status: 400 }
        );
      }
    }

    const mediaFiles: UploadedMediaFile[] = [];
    for (const file of files) {
      mediaFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        arrayBuffer: await file.arrayBuffer(),
      });
    }

    const adminSupabase = createSupabaseAdminClient();
    await ensureMediaBucketExists();

    // 1. Upload ao Supabase Storage (backup)
    const supabaseResults: Array<{ storagePath: string; publicUrl: string }> = [];
    for (const mediaFile of mediaFiles) {
      const timestampPrefix = new Date().toISOString().slice(0, 10);
      const safeName = sanitizeFileName(mediaFile.fileName);
      const storagePath = `${access.companyId}/${timestampPrefix}/${crypto.randomUUID()}-${safeName}`;
      const uploadBuffer = Buffer.from(mediaFile.arrayBuffer);

      const { error: uploadError } = await adminSupabase.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, uploadBuffer, { contentType: mediaFile.fileType, upsert: false });

      if (uploadError) {
        return NextResponse.json(
          { error: "Falha ao enviar arquivo para o Storage.", code: "MEDIA_UPLOAD_ERROR" },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = adminSupabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
      supabaseResults.push({ storagePath, publicUrl: publicUrlData.publicUrl });
    }

    // 2. Upload ao Cloudinary (primario)
    let cloudinaryResults: Awaited<ReturnType<typeof uploadMediaToCloudinary>> | null = null;
    try {
      cloudinaryResults = await uploadMediaToCloudinary(access.companyId, mediaFiles);
    } catch (error) {
      console.error("[MediaLibrary] Cloudinary upload falhou, usando Supabase como fallback:", error);
    }

    // 3. Inserir no banco
    const insertRows: Array<Database["public"]["Tables"]["media_files"]["Insert"]> = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      const supabaseItem = supabaseResults[i];
      const cloudinaryItem = cloudinaryResults?.[i];

      insertRows.push({
        company_id: access.companyId,
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
        tags: [access.companyId, "social-publisher"],
      });
    }

    const { data: insertedRows, error: insertError } = await adminSupabase
      .from("media_files")
      .insert(insertRows)
      .select("id, file_name, file_type, file_size, public_url, cloudinary_public_id, width, height, created_at");

    if (insertError) {
      return NextResponse.json(
        { error: "Falha ao registrar arquivos de midia.", code: "MEDIA_REGISTER_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      companyId: access.companyId,
      items: insertedRows ?? [],
      count: insertedRows?.length ?? 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const result = await deleteMediaFiles(access.companyId, parsed.data.ids);

    return NextResponse.json({
      ok: true,
      companyId: access.companyId,
      deletedIds: result.deletedIds,
      deletedCount: result.deletedIds.length,
      blocked: result.blocked,
      blockedCount: result.blocked.length,
      missingIds: result.missingIds,
      missingCount: result.missingIds.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
