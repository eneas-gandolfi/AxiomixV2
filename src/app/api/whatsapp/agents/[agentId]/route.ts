/**
 * Arquivo: src/app/api/whatsapp/agents/[agentId]/route.ts
 * Propósito: Get, update e delete de agente IA específico via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getAgent, updateAgent, deleteAgent } from "@/services/evo-crm/agents";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ agentId: string }> };

const companyIdSchema = z.string().uuid("companyId inválido.");

const updateSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  role: z.string().optional(),
  goal: z.string().optional(),
  instructions: z.string().optional(),
  model: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId || !companyIdSchema.safeParse(companyId).success) {
      return NextResponse.json(
        { error: "companyId é obrigatório.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);
    const agent = await getAgent(access.companyId, agentId);

    return NextResponse.json({ agent });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar agente.";
    return NextResponse.json({ error: message, code: "AGENT_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = updateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const { companyId: _, ...payload } = parsed.data;
    await updateAgent(access.companyId, agentId, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar agente.";
    return NextResponse.json({ error: message, code: "AGENT_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId || !companyIdSchema.safeParse(companyId).success) {
      return NextResponse.json(
        { error: "companyId é obrigatório.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, companyId);
    await deleteAgent(access.companyId, agentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao deletar agente.";
    return NextResponse.json({ error: message, code: "AGENT_ERROR" }, { status: 500 });
  }
}
