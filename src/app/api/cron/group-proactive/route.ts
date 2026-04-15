/**
 * Arquivo: src/app/api/cron/group-proactive/route.ts
 * Proposito: Cron endpoint para enfileirar jobs proativos do agente de grupo.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { runGroupProactiveCron } from "@/lib/cron/group-proactive";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handle(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const result = await runGroupProactiveCron();
      console.log("[group-proactive cron] Resultado:", JSON.stringify(result));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[group-proactive cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Group proactive cron iniciado em background." });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
