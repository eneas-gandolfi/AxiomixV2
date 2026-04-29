/**
 * Arquivo: src/app/api/whatsapp/agents/[agentId]/inbox/route.ts
 * Propósito: Vincular/desvincular agente IA ao inbox WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-04-29
 *
 * GET: listar integrações do agente
 * POST: vincular (action: "link") ou desvincular (action: "unlink")
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import {
  listAgentIntegrations,
  assignAgentToInbox,
  removeAgentFromInbox,
} from "@/services/evo-crm/agents";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ agentId: string }> };

const companyIdSchema = z.string().uuid();

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("link"),
    companyId: z.string().uuid(),
    inboxId: z.string().min(1, "inboxId é obrigatório."),
  }),
  z.object({
    action: z.literal("unlink"),
    companyId: z.string().uuid(),
    integrationId: z.string().min(1, "integrationId é obrigatório."),
  }),
]);

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
    const integrations = await listAgentIntegrations(access.companyId, agentId);

    return NextResponse.json({ integrations });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar integrações.";
    return NextResponse.json({ error: message, code: "AGENT_INBOX_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = postSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (parsed.data.action === "link") {
      const integration = await assignAgentToInbox(access.companyId, agentId, parsed.data.inboxId);
      return NextResponse.json({ integration }, { status: 201 });
    }

    // action === "unlink"
    await removeAgentFromInbox(access.companyId, agentId, parsed.data.integrationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao processar.";
    return NextResponse.json({ error: message, code: "AGENT_INBOX_ERROR" }, { status: 500 });
  }
}
