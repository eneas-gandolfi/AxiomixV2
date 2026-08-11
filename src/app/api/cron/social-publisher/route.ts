/**
 * Arquivo: src/app/api/cron/social-publisher/route.ts
 * Proposito: Endpoint autenticado para publicar posts agendados do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-08-11
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { processDueScheduledPosts } from "@/services/social/poller";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const result = await processDueScheduledPosts();
      console.log("[social-publisher cron] Resultado:", JSON.stringify(result));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[social-publisher cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Social Publisher iniciado em background." });
}
