/**
 * Arquivo: src/app/api/settings/group-agent/webhook-token/route.ts
 * Propósito: Retornar o webhook token de forma segura (server-side only).
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    await resolveCompanyAccess(supabase);

    const token = process.env.EVOLUTION_WEBHOOK_API_KEY?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Webhook token não configurado.", code: "TOKEN_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Erro ao obter token.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
