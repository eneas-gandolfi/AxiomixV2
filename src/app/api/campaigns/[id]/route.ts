/**
 * Arquivo: src/app/api/campaigns/[id]/route.ts
 * Propósito: CRUD individual de campanha (get, update, delete).
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import {
  getCampaign,
  updateCampaign,
  deleteCampaign,
  CampaignError,
} from "@/services/campaigns/manager";

export const dynamic = "force-dynamic";

const baseSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
});

const updateSchema = baseSchema.extend({
  action: z.literal("update"),
  name: z.string().optional(),
  template_name: z.string().optional(),
  language: z.string().optional(),
  body_params_template: z.array(z.string()).optional(),
  header_params_template: z.array(z.string()).optional(),
  inbox_id: z.string().optional(),
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

const deleteSchema = baseSchema.extend({
  action: z.literal("delete"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();

    // Tentar parse como delete
    const deleteParsed = deleteSchema.safeParse(rawBody);
    if (deleteParsed.success && deleteParsed.data.action === "delete") {
      const access = await resolveCompanyAccess(supabase, deleteParsed.data.companyId);
      await deleteCampaign(campaignId, access.companyId);
      return NextResponse.json({ ok: true });
    }

    // Tentar parse como update
    const updateParsed = updateSchema.safeParse(rawBody);
    if (updateParsed.success && updateParsed.data.action === "update") {
      const access = await resolveCompanyAccess(supabase, updateParsed.data.companyId);
      const { action: _, companyId: __, ...updateFields } = updateParsed.data;
      const campaign = await updateCampaign(campaignId, access.companyId, updateFields);
      return NextResponse.json({ campaign });
    }

    // Default: get
    const parsed = baseSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const campaign = await getCampaign(campaignId, access.companyId);
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao processar campanha.";
    return NextResponse.json({ error: message, code: "CAMPAIGN_ERROR" }, { status: 500 });
  }
}
