/**
 * Arquivo: src/app/api/cron/heartbeat/route.ts
 * Propósito: Endpoint unificado de cron — consolida recover, process e sync em uma chamada.
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { runHeartbeat } from "@/lib/cron/heartbeat";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const result = await runHeartbeat();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    console.error("[heartbeat cron] Erro:", detail);
    return NextResponse.json(
      { error: detail, code: "HEARTBEAT_CRON_ERROR" },
      { status: 500 }
    );
  }
}
