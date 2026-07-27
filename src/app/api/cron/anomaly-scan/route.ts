/**
 * Arquivo: src/app/api/cron/anomaly-scan/route.ts
 * Propósito: Endpoint HTTP do cron diário de anomalias (Intelligence Layer).
 *            No deploy self-hosted o scheduler chama a lib direto; este
 *            endpoint existe pra disparo manual/externo autenticado.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { runAnomalyScanCron } from "@/lib/cron/anomaly-scan";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const result = await runAnomalyScanCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no anomaly-scan.";
    return NextResponse.json({ error: message, code: "ANOMALY_SCAN_ERROR" }, { status: 500 });
  }
}
