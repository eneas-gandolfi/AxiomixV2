/**
 * Arquivo: src/app/api/social/publish/route.ts
 * Propósito: Receber callback assinado do QStash e publicar posts nas plataformas.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { publishScheduledPost, SocialPublisherError } from "@/services/social/publisher";

export const dynamic = "force-dynamic";

const publishPayloadSchema = z.object({
  scheduledPostId: z.string().uuid("scheduledPostId inválido."),
  companyId: z.string().uuid("companyId inválido."),
});

async function publishHandler(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = publishPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await publishScheduledPost({
      scheduledPostId: parsed.data.scheduledPostId,
      expectedCompanyId: parsed.data.companyId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof SocialPublisherError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "SOCIAL_PUBLISH_ERROR" }, { status: 500 });
  }
}

const publishUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/api/social/publish`
  : undefined;

export const POST = verifySignatureAppRouter(publishHandler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  url: publishUrl,
});
