/**
 * Arquivo: src/app/api/settings/usage/route.ts
 * Propósito: API de estatísticas de uso de IA — restrito a owners.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CompanyAccessError, resolveCompanyAccess } from "@/lib/auth/resolve-company-access";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getUsageStats } from "@/services/usage/stats";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  period: z.enum(["7d", "30d"]).default("7d"),
});

export async function GET(req: NextRequest) {
  const response = NextResponse.next();
  try {
    const supabase = createSupabaseRouteHandlerClient(req, response);
    const access = await resolveCompanyAccess(supabase);

    if (access.role !== "owner" && access.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas owner e administradores podem acessar dados de uso.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { period } = querySchema.parse(searchParams);

    const stats = await getUsageStats(access.companyId, period);

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error("[api/settings/usage] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar uso de IA." },
      { status: 500 }
    );
  }
}
