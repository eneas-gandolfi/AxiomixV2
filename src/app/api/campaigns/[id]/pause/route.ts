/**
 * Arquivo: src/app/api/campaigns/[id]/pause/route.ts
 * Propósito: Pausar ou retomar execucao de campanha.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { pauseCampaign, resumeCampaign, CampaignError } from "@/services/campaigns/manager";
import { scheduleCampaignBatch } from "@/services/campaigns/qstash";

export const dynamic = "force-dynamic";

const pauseSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  action: z.enum(["pause", "resume"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = pauseSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    if (parsed.data.action === "resume") {
      const campaign = await resumeCampaign(campaignId, access.companyId);
      await scheduleCampaignBatch({ campaignId, companyId: access.companyId });
      return NextResponse.json({ campaign });
    }

    const campaign = await pauseCampaign(campaignId, access.companyId);
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao pausar/retomar campanha.";
    return NextResponse.json({ error: message, code: "PAUSE_ERROR" }, { status: 500 });
  }
}
