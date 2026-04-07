/**
 * Arquivo: src/app/api/integrations/evolution-api/groups/route.ts
 * Propósito: Listar grupos WhatsApp disponíveis na Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import {
  resolveEvolutionCredentials,
  resolvePreferredEvolutionInstance,
  fetchEvolutionGroups,
} from "@/services/integrations/evolution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    const access = await resolveCompanyAccess(supabase);

    const admin = createSupabaseAdminClient();

    // Tentar carregar credenciais do banco (integração configurada pela UI)
    let credentials;
    let instanceName = process.env.EVOLUTION_INSTANCE_NAME?.trim() || "axiomix-default";

    const { data: integration } = await admin
      .from("integrations")
      .select("config")
      .eq("company_id", access.companyId)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    if (integration?.config) {
      const decoded = decodeIntegrationConfig("evolution_api", integration.config);
      credentials = resolveEvolutionCredentials({
        baseUrl: decoded.baseUrl,
        apiKey: decoded.apiKey,
      });
      instanceName =
        resolvePreferredEvolutionInstance(decoded.vendors) ??
        instanceName;
    } else {
      credentials = resolveEvolutionCredentials();
    }

    const groups = await fetchEvolutionGroups({ credentials, instanceName });

    return NextResponse.json({ groups });
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail, code: "EVOLUTION_GROUPS_ERROR" }, { status: 500 });
  }
}
