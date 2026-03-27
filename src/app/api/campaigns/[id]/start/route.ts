/**
 * Arquivo: src/app/api/campaigns/[id]/start/route.ts
 * Propósito: Iniciar execucao de uma campanha em massa.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { startCampaign, getCampaign, CampaignError } from "@/services/campaigns/manager";
import { scheduleCampaignBatch, scheduleDelayedCampaign } from "@/services/campaigns/qstash";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = startSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const campaign = await getCampaign(campaignId, access.companyId);

    // Verificar se é agendamento futuro
    if (campaign.scheduled_at) {
      const scheduledDate = new Date(campaign.scheduled_at);
      if (scheduledDate > new Date()) {
        // Agendar para o futuro via QStash
        await createSupabaseAdminClient().from("campaigns")
          .update({ status: "scheduled", updated_at: new Date().toISOString() })
          .eq("id", campaignId);

        const qstashResult = await scheduleDelayedCampaign({
          campaignId,
          companyId: access.companyId,
          scheduledAtIso: campaign.scheduled_at,
        });

        await createSupabaseAdminClient().from("campaigns")
          .update({ qstash_message_id: qstashResult.messageId })
          .eq("id", campaignId);

        const updated = await getCampaign(campaignId, access.companyId);
        return NextResponse.json({ campaign: updated });
      }
    }

    // Iniciar imediatamente
    const started = await startCampaign(campaignId, access.companyId);
    const qstashResult = await scheduleCampaignBatch({
      campaignId,
      companyId: access.companyId,
    });

    await createSupabaseAdminClient().from("campaigns")
      .update({ qstash_message_id: qstashResult.messageId })
      .eq("id", campaignId);

    return NextResponse.json({ campaign: { ...started, qstash_message_id: qstashResult.messageId } });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao iniciar campanha.";
    return NextResponse.json({ error: message, code: "START_ERROR" }, { status: 500 });
  }
}
