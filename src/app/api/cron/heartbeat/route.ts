/**
 * Arquivo: src/app/api/cron/heartbeat/route.ts
 * Propósito: Endpoint unificado de cron — housekeeping e enqueue.
 *            Responde imediatamente e executa em background via after().
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { runHeartbeat } from "@/lib/cron/heartbeat";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const result = await runHeartbeat();
      console.log("[heartbeat cron] Resultado:", JSON.stringify(result));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[heartbeat cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Heartbeat iniciado em background." });
}
