/**
 * Arquivo: src/app/api/integrations/route.ts
 * Propósito: Listar integrações da empresa sem expor credenciais sensíveis.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { buildIntegrationPublicItem } from "@/lib/integrations/service";

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
        { status: 401 }
      );
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Empresa não encontrada para este usuário.", code: "COMPANY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("id, type, config, is_active, test_status, last_tested_at, created_at, company_id")
      .eq("company_id", membership.company_id)
      .order("type", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Falha ao carregar integrações.", code: "INTEGRATIONS_FETCH_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: (integrations ?? []).map((item) => buildIntegrationPublicItem(item)),
      companyId: membership.company_id,
      role: membership.role,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "INTEGRATIONS_GET_ERROR" }, { status: 500 });
  }
}
