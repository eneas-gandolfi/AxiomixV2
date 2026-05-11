/**
 * Arquivo: src/app/api/cron/niche-aggregates/route.ts
 * Propósito: Cron diário que chama recompute_niche_aggregates() pra atualizar
 *            os agregados por nicho. Base do benchmark "Você vs nicho" no
 *            dashboard global.
 *
 *            Recomendado rodar 1x/dia (ex: 04:00 UTC). Custo: 1 chamada SQL.
 * Autor: AXIOMIX
 * Data: 2026-05-06
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { NICHE_AGGREGATES_TAG } from "@/lib/dashboard/niche-aggregates-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const supabase = createSupabaseAdminClient();

    // RPC retorna o número de linhas afetadas (insert ou update).
    const { data, error } = await supabase.rpc("recompute_niche_aggregates");

    if (error) {
      return NextResponse.json(
        {
          error: "Falha ao recomputar agregados.",
          code: "RECOMPUTE_ERROR",
          detail:
            process.env.NODE_ENV === "production"
              ? undefined
              : { dbCode: error.code, dbMessage: error.message },
        },
        { status: 500 },
      );
    }

    const affectedNiches = typeof data === "number" ? data : 0;

    // Invalida o cache da leitura `niche_aggregates` do dashboard pra que o
    // benchmark passe a refletir os agregados recem-recomputados sem esperar
    // os 3600s de revalidate natural. Next 16 exige profile no segundo arg —
    // 'hours' casa com o lifetime ja configurado no unstable_cache.
    revalidateTag(NICHE_AGGREGATES_TAG, "hours");

    return NextResponse.json({
      ok: true,
      affectedNiches,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json(
      { error: detail, code: "CRON_NICHE_AGGREGATES_ERROR" },
      { status: 500 },
    );
  }
}
