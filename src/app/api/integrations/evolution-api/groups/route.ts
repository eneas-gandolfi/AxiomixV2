/**
 * Arquivo: src/app/api/integrations/evolution-api/groups/route.ts
 * Propósito: Listar grupos WhatsApp disponíveis na Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  resolveEvolutionCredentials,
  fetchEvolutionGroups,
} from "@/services/integrations/evolution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteHandlerClient(request, response);
    await resolveCompanyAccess(supabase);

    const instanceName =
      process.env.EVOLUTION_INSTANCE_NAME?.trim() || "axiomix-default";

    const credentials = resolveEvolutionCredentials();
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
