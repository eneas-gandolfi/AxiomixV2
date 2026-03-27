/**
 * Arquivo: src/app/api/campaigns/[id]/recipients/generate/route.ts
 * Propósito: Gerar lista de destinatarios a partir dos filtros da campanha.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getCampaign, CampaignError } from "@/services/campaigns/manager";
import { generateRecipients } from "@/services/campaigns/recipient-generator";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = generateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Garantir que a campanha pertence à empresa e está em draft
    const campaign = await getCampaign(campaignId, access.companyId);
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Somente campanhas em rascunho podem ter a lista regenerada.", code: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    const result = await generateRecipients(campaignId, access.companyId);

    return NextResponse.json({
      ok: true,
      generated: result.generated,
      skipped: result.skipped,
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao gerar lista de destinatários.";
    return NextResponse.json({ error: message, code: "GENERATE_ERROR" }, { status: 500 });
  }
}
