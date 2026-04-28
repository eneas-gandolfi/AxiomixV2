/**
 * Arquivo: src/app/api/social/demands/route.ts
 * Propósito: Listar e criar demandas de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { handleRouteError } from "@/lib/api/handle-route-error";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  listDemands,
  createDemand,
  ContentDemandError,
} from "@/services/social/content-demands";
import type { DemandStatus } from "@/types/modules/content-demands.types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: DemandStatus[] = [
  "rascunho", "em_revisao", "alteracoes_solicitadas", "aprovado", "agendado", "publicado",
];

const createSchema = z.object({
  companyId: z.string().uuid().optional(),
  title: z.string().min(1, "Título é obrigatório.").max(200),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  platforms: z.array(z.enum(["instagram", "linkedin", "tiktok", "facebook"])).default([]),
  dueDate: z.string().datetime().optional().nullable(),
  caption: z.string().max(2200).optional().nullable(),
  mediaFileIds: z.array(z.string().uuid()).optional().default([]),
});


export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const sp = request.nextUrl.searchParams;

    const companyId = sp.get("companyId") ?? undefined;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const statusRaw = sp.get("status");
    const status = statusRaw && VALID_STATUSES.includes(statusRaw as DemandStatus)
      ? (statusRaw as DemandStatus)
      : undefined;
    const assignedTo = sp.get("assignedTo") ?? undefined;
    const platform = sp.get("platform") as "instagram" | "linkedin" | "tiktok" | "facebook" | undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    const result = await listDemands({
      companyId: access.companyId,
      page,
      status,
      assignedTo,
      platform: platform && ["instagram", "linkedin", "tiktok", "facebook"].includes(platform) ? platform : undefined,
    });

    return NextResponse.json({ companyId: access.companyId, ...result });
  } catch (error) {
    return handleRouteError(error, "SOCIAL_ERROR", request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json();

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const demand = await createDemand({
      companyId: access.companyId,
      title: parsed.data.title,
      description: parsed.data.description,
      assignedTo: parsed.data.assignedTo,
      platforms: parsed.data.platforms,
      dueDate: parsed.data.dueDate,
      caption: parsed.data.caption,
      mediaFileIds: parsed.data.mediaFileIds,
      createdBy: access.userId,
    });

    return NextResponse.json({ companyId: access.companyId, demand });
  } catch (error) {
    return handleRouteError(error, "SOCIAL_ERROR", request);
  }
}
