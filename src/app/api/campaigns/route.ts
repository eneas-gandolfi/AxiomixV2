/**
 * Arquivo: src/app/api/campaigns/route.ts
 * Propósito: Listar e criar campanhas em massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { listCampaigns, createCampaign, CampaignError } from "@/services/campaigns/manager";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  status: z.string().optional(),
});

const createSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.literal("create"),
  name: z.string().min(1, "Nome é obrigatório."),
  template_name: z.string().min(1, "Template é obrigatório."),
  language: z.string().optional(),
  body_params_template: z.array(z.string()).optional(),
  header_params_template: z.array(z.string()).optional(),
  inbox_id: z.string().min(1, "Inbox é obrigatório."),
  filters: z
    .object({
      labelIds: z.array(z.string()).optional(),
      gender: z.string().optional(),
      createdAfter: z.string().optional(),
      createdBefore: z.string().optional(),
    })
    .optional(),
  scheduled_at: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();

    // Tentar parse como create primeiro
    const createParsed = createSchema.safeParse(rawBody);
    if (createParsed.success && createParsed.data.action === "create") {
      const access = await resolveCompanyAccess(supabase, createParsed.data.companyId);
      const campaign = await createCampaign({
        company_id: access.companyId,
        name: createParsed.data.name,
        template_name: createParsed.data.template_name,
        language: createParsed.data.language,
        body_params_template: createParsed.data.body_params_template,
        header_params_template: createParsed.data.header_params_template,
        inbox_id: createParsed.data.inbox_id,
        filters: createParsed.data.filters,
        scheduled_at: createParsed.data.scheduled_at,
        created_by: access.userId,
      });
      return NextResponse.json({ campaign });
    }

    // Default: listar
    const listParsed = listSchema.safeParse(rawBody);
    if (!listParsed.success) {
      return NextResponse.json(
        { error: listParsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, listParsed.data.companyId);
    const result = await listCampaigns(
      access.companyId,
      listParsed.data.page ?? 1,
      listParsed.data.pageSize ?? 20
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao processar campanhas.";
    return NextResponse.json({ error: message, code: "CAMPAIGNS_ERROR" }, { status: 500 });
  }
}
