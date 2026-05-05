/**
 * Arquivo: src/app/api/whatsapp/live-operation/route.ts
 * Propósito: Endpoint JSON consumido pelo client da aba Operação pra polling
 *            de 30s. Server-side faz auth via cookie de sessão e delega pra
 *            getLiveOperationData().
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";
import { getLiveOperationData } from "@/lib/whatsapp/live-operation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const companyId = await getUserCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Empresa não encontrada.", code: "COMPANY_NOT_FOUND" },
        { status: 404 },
      );
    }

    const data = await getLiveOperationData(supabase, companyId);

    return NextResponse.json({
      data,
      // Contexto pro client poder agir (ex: "Assumir conversa" precisa de
      // currentUserId + companyId pra chamar /api/whatsapp/assign).
      context: {
        currentUserId: user.id,
        companyId,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "LIVE_OPERATION_ERROR" },
      { status: 500 },
    );
  }
}
