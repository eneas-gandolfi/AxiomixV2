/**
 * Arquivo: src/app/api/social/demands/[id]/route.ts
 * Propósito: Obter, atualizar e excluir uma demanda de conteúdo.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  getDemand,
  updateDemand,
  deleteDemand,
  ContentDemandError,
} from "@/services/social/content-demands";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  companyId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  platforms: z.array(z.enum(["instagram", "linkedin", "tiktok", "facebook"])).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  caption: z.string().max(2200).optional().nullable(),
  mediaFileIds: z.array(z.string().uuid()).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ContentDemandError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const detail = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: detail, code: "DEMAND_ERROR" }, { status: 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    const result = await getDemand(access.companyId, id);

    return NextResponse.json({ companyId: access.companyId, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const body: unknown = await request.json();

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload invalido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const demand = await updateDemand(access.companyId, id, parsed.data);

    return NextResponse.json({ companyId: access.companyId, demand });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;

    const access = await resolveCompanyAccess(supabase, companyId);
    await deleteDemand(access.companyId, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
