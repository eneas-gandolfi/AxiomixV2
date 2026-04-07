/**
 * Arquivo: src/lib/cron/whatsapp-batch.ts
 * Proposito: Logica do cron de batch analysis WhatsApp (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBatchAnalysis } from "@/services/whatsapp/batch-analyzer";

export async function runWhatsappBatchCron() {
  const supabase = createSupabaseAdminClient();

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas.");
  }

  const companyIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((item) => item.company_id)
        .filter((value): value is string => typeof value === "string")
    )
  );

  const results = await Promise.allSettled(
    companyIds.map((companyId) => runBatchAnalysis(companyId))
  );

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      succeeded++;
    } else {
      failed++;
      const reason = results[i] as PromiseRejectedResult;
      const detail = reason.reason instanceof Error ? reason.reason.message : "Erro inesperado";
      console.error(`[whatsapp-batch] Erro na empresa ${companyIds[i]}:`, detail);
    }
  }

  return { companies: companyIds.length, succeeded, failed };
}
