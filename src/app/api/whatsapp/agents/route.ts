/**
 * Arquivo: src/app/api/whatsapp/agents/route.ts
 * Propósito: Listar e criar agentes IA via Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { listAgents, createAgent, AGENT_TYPES } from "@/services/evo-crm/agents";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
});

const createSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  name: z.string().min(1, "Nome do agente é obrigatório."),
  description: z.string().optional(),
  agent_type: z.enum(AGENT_TYPES, { error: "Tipo de agente inválido." }),
  role: z.string().optional(),
  goal: z.string().optional(),
  instructions: z.string().optional(),
  model: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json(
        { error: "companyId é obrigatório.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = listSchema.safeParse({ companyId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const agents = await listAgents(access.companyId);

    return NextResponse.json({ agents });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar agentes.";
    return NextResponse.json({ error: message, code: "AGENTS_ERROR" }, { status: 500 });
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
    const agent = await createAgent(access.companyId, payload);

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar agente.";
    return NextResponse.json({ error: message, code: "AGENTS_ERROR" }, { status: 500 });
  }
}
