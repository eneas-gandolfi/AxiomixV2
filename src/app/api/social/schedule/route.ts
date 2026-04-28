/**
 * Arquivo: src/app/api/social/schedule/route.ts
 * Propósito: Listar e criar agendamentos do módulo Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { handleRouteError } from "@/lib/api/handle-route-error";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  createScheduledPost,
  listScheduledPosts,
  parseSocialStatus,
  SocialPublisherError,
  type UploadedMediaFile,
} from "@/services/social/publisher";
import type { SocialPlatform, SocialPostType } from "@/types/modules/social-publisher.types";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  companyId: z.string().uuid("companyId inválido.").optional(),
  page: z.coerce.number().int().min(1).default(1),
  status: z
    .enum(["scheduled", "processing", "published", "partial", "failed", "cancelled"])
    .optional(),
  dateFrom: z.string().datetime("dateFrom inválida.").optional(),
  dateTo: z.string().datetime("dateTo inválida.").optional(),
});

const schedulePostSchema = z
  .object({
    companyId: z.string().uuid("companyId inválido.").optional(),
    postType: z.enum(["photo", "video", "carousel"]),
    caption: z.string().max(2200, "Legenda excede 2200 caracteres.").optional(),
    platforms: z.array(z.enum(["instagram", "linkedin", "tiktok", "facebook"])).min(1),
    publishNow: z.boolean().default(false),
    scheduledAt: z.string().datetime("scheduledAt inválido.").optional(),
  })
  .superRefine((value, context) => {
    if (!value.publishNow && !value.scheduledAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledAt"],
        message: "scheduledAt é obrigatório quando publishNow = false.",
      });
    }
  });

function parseMediaFileIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function parsePlatformsInput(raw: string | null): SocialPlatform[] {
  if (!raw) {
    return [];
  }

  try {
    const parsedUnknown: unknown = JSON.parse(raw);
    if (!Array.isArray(parsedUnknown)) {
      return [];
    }
    return parsedUnknown.filter(
      (item): item is SocialPlatform =>
        item === "instagram" || item === "linkedin" || item === "tiktok" || item === "facebook"
    );
  } catch {
    return [];
  }
}

function parseBoolean(raw: string | null) {
  return raw === "true" || raw === "1";
}

async function parseUploadedMediaFiles(formData: FormData): Promise<UploadedMediaFile[]> {
  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((entry): entry is File => entry instanceof File);
  const normalized: UploadedMediaFile[] = [];

  for (const file of files) {
    if (!file.size) {
      continue;
    }
    normalized.push({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      arrayBuffer: await file.arrayBuffer(),
    });
  }

  return normalized;
}


export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const parsedQuery = querySchema.safeParse({
      companyId: request.nextUrl.searchParams.get("companyId") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? 1,
      status: parseSocialStatus(request.nextUrl.searchParams.get("status")),
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0]?.message ?? "Query inválida.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsedQuery.data.companyId);
    const result = await listScheduledPosts({
      companyId: access.companyId,
      page: parsedQuery.data.page,
      pageSize: 20,
      status: parsedQuery.data.status,
      dateFrom: parsedQuery.data.dateFrom,
      dateTo: parsedQuery.data.dateTo,
    });

    return NextResponse.json({
      companyId: access.companyId,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, "SOCIAL_ERROR", request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const formData = await request.formData();

    const rawPostType = formData.get("postType");
    const rawCompanyId = formData.get("companyId");
    const rawCaption = formData.get("caption");
    const rawPlatforms = formData.get("platforms");
    const rawPublishNow = formData.get("publishNow");
    const rawScheduledAt = formData.get("scheduledAt");

    const parsed = schedulePostSchema.safeParse({
      companyId: typeof rawCompanyId === "string" ? rawCompanyId : undefined,
      postType: typeof rawPostType === "string" ? (rawPostType as SocialPostType) : undefined,
      caption: typeof rawCaption === "string" ? rawCaption : undefined,
      platforms:
        typeof rawPlatforms === "string" ? parsePlatformsInput(rawPlatforms) : [],
      publishNow: typeof rawPublishNow === "string" ? parseBoolean(rawPublishNow) : false,
      scheduledAt: typeof rawScheduledAt === "string" ? rawScheduledAt : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Verificar se veio mediaFileIds (reuso da biblioteca) ou arquivos novos
    const rawMediaFileIds = formData.get("mediaFileIds");
    const existingMediaFileIds = typeof rawMediaFileIds === "string"
      ? parseMediaFileIds(rawMediaFileIds)
      : [];

    const mediaFiles = existingMediaFileIds.length > 0
      ? []
      : await parseUploadedMediaFiles(formData);

    if (mediaFiles.length === 0 && existingMediaFileIds.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo de midia enviado.", code: "MEDIA_REQUIRED" },
        { status: 400 }
      );
    }

    const scheduledAtIso = parsed.data.publishNow
      ? new Date().toISOString()
      : parsed.data.scheduledAt ?? new Date().toISOString();
    const created = await createScheduledPost({
      companyId: access.companyId,
      postType: parsed.data.postType,
      caption: parsed.data.caption ?? null,
      platforms: parsed.data.platforms,
      scheduledAtIso,
      mediaFiles,
      existingMediaFileIds: existingMediaFileIds.length > 0 ? existingMediaFileIds : undefined,
    });

    return NextResponse.json({
      companyId: access.companyId,
      item: created.scheduledPost,
      mediaFiles: created.mediaFiles,
    });
  } catch (error) {
    return handleRouteError(error, "SOCIAL_ERROR", request);
  }
}
