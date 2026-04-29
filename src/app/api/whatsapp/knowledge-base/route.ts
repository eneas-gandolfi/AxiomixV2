/**
 * Arquivo: src/app/api/whatsapp/knowledge-base/route.ts
 * Propósito: Listar e criar knowledge bases via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { listKnowledgeBases, createKnowledgeBase } from "@/services/evo-crm/knowledge-base";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório."),
  description: z.string().optional(),
  provider: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);
    const knowledgeBases = await listKnowledgeBases(access.companyId);

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar bases de conhecimento.";
    return NextResponse.json({ error: message, code: "KB_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = createSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const { companyId: _, ...payload } = parsed.data;
    const kb = await createKnowledgeBase(access.companyId, payload);

    return NextResponse.json({ knowledgeBase: kb }, { status: 201 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar base de conhecimento.";
    return NextResponse.json({ error: message, code: "KB_ERROR" }, { status: 500 });
  }
}
