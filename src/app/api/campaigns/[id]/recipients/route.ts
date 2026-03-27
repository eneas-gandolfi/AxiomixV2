/**
 * Arquivo: src/app/api/campaigns/[id]/recipients/route.ts
 * Propósito: Listar destinatarios de uma campanha com paginacao e filtro por status.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getCampaign, CampaignError } from "@/services/campaigns/manager";
import { listRecipients, getRecipientCount } from "@/services/campaigns/recipient-generator";

export const dynamic = "force-dynamic";

const recipientsSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  status: z.enum(["pending", "sent", "failed", "skipped"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = recipientsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);

    // Garantir que a campanha pertence à empresa
    await getCampaign(campaignId, access.companyId);

    const result = await listRecipients(
      campaignId,
      parsed.data.page ?? 1,
      parsed.data.pageSize ?? 20,
      parsed.data.status
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao listar destinatários.";
    return NextResponse.json({ error: message, code: "RECIPIENTS_ERROR" }, { status: 500 });
  }
}
