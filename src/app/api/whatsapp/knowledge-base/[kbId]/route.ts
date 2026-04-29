/**
 * Arquivo: src/app/api/whatsapp/knowledge-base/[kbId]/route.ts
 * Propósito: Get, delete KB + listar documentos, adicionar conteúdo, buscar.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import {
  getKnowledgeBase,
  deleteKnowledgeBase,
  listDocuments,
  addContent,
  searchKnowledge,
} from "@/services/evo-crm/knowledge-base";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ kbId: string }> };

const companyIdSchema = z.string().uuid();

const addContentSchema = z.discriminatedUnion("type", [
  z.object({
    companyId: z.string().uuid(),
    type: z.literal("manual"),
    title: z.string().min(1),
    content: z.string().min(1),
  }),
  z.object({
    companyId: z.string().uuid(),
    type: z.literal("url"),
    url: z.string().url(),
    include_subpages: z.boolean().optional(),
  }),
]);

const searchSchema = z.object({
  companyId: z.string().uuid(),
  query: z.string().min(1),
  max_results: z.number().int().min(1).max(20).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { kbId } = await params;
    const companyId = request.nextUrl.searchParams.get("companyId");
    const action = request.nextUrl.searchParams.get("action");

    if (!companyId || !companyIdSchema.safeParse(companyId).success) {
      return NextResponse.json({ error: "companyId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);

    if (action === "documents") {
      const documents = await listDocuments(access.companyId, kbId);
      return NextResponse.json({ documents });
    }

    const kb = await getKnowledgeBase(access.companyId, kbId);
    return NextResponse.json({ knowledgeBase: kb });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar base de conhecimento.";
    return NextResponse.json({ error: message, code: "KB_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { kbId } = await params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();

    // Detectar ação: add-content ou search
    const body = rawBody as Record<string, unknown>;
    const action = body.action;

    if (action === "search") {
      const parsed = searchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message, code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }
      const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
      const results = await searchKnowledge(access.companyId, kbId, parsed.data.query, parsed.data.max_results);
      return NextResponse.json({ results });
    }

    // Default: add content
    const parsed = addContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const { companyId: _, ...payload } = parsed.data;
    const document = await addContent(access.companyId, kbId, payload);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao processar.";
    return NextResponse.json({ error: message, code: "KB_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { kbId } = await params;
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId || !companyIdSchema.safeParse(companyId).success) {
      return NextResponse.json({ error: "companyId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);
    await deleteKnowledgeBase(access.companyId, kbId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao deletar.";
    return NextResponse.json({ error: message, code: "KB_ERROR" }, { status: 500 });
  }
}
