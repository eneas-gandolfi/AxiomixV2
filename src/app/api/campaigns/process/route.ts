/**
 * Arquivo: src/app/api/campaigns/process/route.ts
 * Propósito: Receber callback assinado do QStash e processar batch de envios da campanha.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { processCampaignBatch } from "@/services/campaigns/executor";
import { CampaignError } from "@/services/campaigns/manager";

export const dynamic = "force-dynamic";

const campaignPayloadSchema = z.object({
  campaignId: z.string().uuid("campaignId inválido."),
  companyId: z.string().uuid("companyId inválido."),
});

async function campaignProcessHandler(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = campaignPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await processCampaignBatch(
      parsed.data.campaignId,
      parsed.data.companyId
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof CampaignError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "CAMPAIGN_PROCESS_ERROR" }, { status: 500 });
  }
}

const processUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/api/campaigns/process`
  : undefined;

export const POST = verifySignatureAppRouter(campaignProcessHandler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  url: processUrl,
});
