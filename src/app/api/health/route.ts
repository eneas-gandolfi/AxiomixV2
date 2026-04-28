/**
 * Arquivo: src/app/api/health/route.ts
 * Propósito: Health check endpoint — verifica conectividade do banco e reporta uptime.
 * Autor: AXIOMIX
 * Data: 2026-04-28
 */

import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const startTime = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const timestamp = new Date().toISOString();

  try {
    const supabase = createSupabaseAdminClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const { error } = await supabase
      .from("companies")
      .select("id")
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error) {
      return NextResponse.json(
        { status: "error", db: "error", uptime, timestamp },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "ok", db: "ok", uptime, timestamp },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "timeout", uptime, timestamp },
      { status: 503 }
    );
  }
}
