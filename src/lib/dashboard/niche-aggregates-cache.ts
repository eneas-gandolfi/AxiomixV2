/**
 * Arquivo: src/lib/dashboard/niche-aggregates-cache.ts
 * Proposito: Cache de leitura para a tabela `niche_aggregates`. O cron diario
 *            `/api/cron/niche-aggregates` recomputa a tabela; a UI le com
 *            staleness de ate 1h e invalidacao explicita via tag quando o
 *            cron termina. Tabela tem RLS desligado (dado publico-agregado).
 * Autor: AXIOMIX
 * Data: 2026-05-11
 */

import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NicheAggregatesRow = {
  peer_count: number;
  sentiment_positive_pct: number | null;
  opportunity_pct: number | null;
  avg_weekly_volume: number | null;
  computed_at: string | null;
};

export const NICHE_AGGREGATES_TAG = "niche-aggregates";

/**
 * Le `niche_aggregates` por slug com cache de 1h. Cron pode revalidar via tag
 * imediatamente apos recomputar (vide /api/cron/niche-aggregates).
 *
 * Usa cliente admin: dispensa cookies (`unstable_cache` nao gosta de runtime
 * APIs no callback) e a tabela e publica-agregada por design.
 */
export const getNicheAggregates = unstable_cache(
  async (nicheSlug: string): Promise<NicheAggregatesRow | null> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("niche_aggregates")
      .select(
        "peer_count, sentiment_positive_pct, opportunity_pct, avg_weekly_volume, computed_at",
      )
      .eq("niche_slug", nicheSlug)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  },
  ["niche-aggregates-by-slug"],
  {
    revalidate: 3600,
    tags: [NICHE_AGGREGATES_TAG],
  },
);
