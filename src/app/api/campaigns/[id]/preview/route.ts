/**
 * Arquivo: src/app/api/campaigns/[id]/preview/route.ts
 * Propósito: Preview de template renderizado com dados de contato exemplo.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { getCampaign, CampaignError } from "@/services/campaigns/manager";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  companyId: z.string().uuid("companyId inválido."),
  sampleVariables: z
    .record(z.string(), z.string())
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: campaignId } = await context.params;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const rawBody: unknown = await request.json();
    const parsed = previewSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const access = await resolveCompanyAccess(supabase, parsed.data.companyId);
    const campaign = await getCampaign(campaignId, access.companyId);

    const sampleVars = parsed.data.sampleVariables ?? {
      name: "João Silva",
      phone: "+5511999999999",
      email: "joao@exemplo.com",
    };

    const resolvedBody = campaign.body_params_template.map((tpl) =>
      tpl.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (_match: string, key: string): string => {
        return sampleVars[key] ?? sampleVars[key.split(".").pop() ?? ""] ?? `{{${key}}}`;
      })
    );

    const resolvedHeader = campaign.header_params_template.map((tpl) =>
      tpl.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (_match: string, key: string): string => {
        return sampleVars[key] ?? sampleVars[key.split(".").pop() ?? ""] ?? `{{${key}}}`;
      })
    );

    return NextResponse.json({
      preview: {
        template_name: campaign.template_name,
        language: campaign.language,
        body_params: resolvedBody,
        header_params: resolvedHeader,
        sample_variables: sampleVars,
      },
    });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro ao gerar preview.";
    return NextResponse.json({ error: message, code: "PREVIEW_ERROR" }, { status: 500 });
  }
}
