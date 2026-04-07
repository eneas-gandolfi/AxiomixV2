/**
 * Arquivo: src/lib/cron/report-daily.ts
 * Proposito: Logica do cron de relatorio diario (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export async function runDailyReportCron() {
  const supabase = createSupabaseAdminClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas para enfileirar relatório diário.");
  }

  const companyIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((item) => item.company_id)
        .filter((value): value is string => typeof value === "string")
    )
  );

  let enqueued = 0;
  for (const companyId of companyIds) {
    await enqueueJob("daily_report", {}, companyId);
    enqueued += 1;
  }

  return { enqueued };
}
