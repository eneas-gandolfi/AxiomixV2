/**
 * Arquivo: src/app/api/rag/process/route.ts
 * Propósito: Callback endpoint do QStash para processar documentos RAG em background.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { runRagProcessWorker } from "@/services/rag/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ragProcessPayloadSchema = z.object({
  documentId: z.string().uuid("documentId inválido."),
  companyId: z.string().uuid("companyId inválido."),
});

async function processHandler(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json().catch(() => ({}));
    const parsed = ragProcessPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await runRagProcessWorker(parsed.data.companyId, {
      documentId: parsed.data.documentId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "RAG_PROCESS_ERROR" }, { status: 500 });
  }
}

const processUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}/api/rag/process`
  : undefined;

export const POST = verifySignatureAppRouter(processHandler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  url: processUrl,
});
