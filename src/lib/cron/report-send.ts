/**
 * Arquivo: src/lib/cron/report-send.ts
 * Proposito: Logica do cron de relatorio semanal (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export async function runWeeklyReportCron() {
  const supabase = createSupabaseAdminClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .not("company_id", "is", null);

  if (error) {
    throw new Error("Falha ao carregar empresas ativas para enfileirar relatório.");
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
    await enqueueJob("weekly_report", {}, companyId);
    enqueued += 1;
  }

  return { enqueued };
}
