/**
 * Arquivo: src/lib/cron/group-proactive.ts
 * Proposito: Logica do cron de proatividade de grupo (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { cleanExpiredSessions } from "@/services/group-agent/session-manager";

export async function runGroupProactiveCron() {
  const supabase = createSupabaseAdminClient();
  const currentHour = new Date().getUTCHours();

  const { data: configs } = await supabase
    .from("group_agent_configs")
    .select("id, company_id, proactive_summary, proactive_summary_hour, proactive_sales_alert")
    .eq("is_active", true)
    .eq("is_hidden", false);

  if (!configs || configs.length === 0) {
    return { enqueued: 0, sessionsCleared: 0 };
  }

  let enqueued = 0;

  for (const config of configs) {
    if (config.proactive_summary && config.proactive_summary_hour === currentHour) {
      await enqueueJob(
        "group_proactive",
        { configId: config.id, action: "daily_summary" },
        config.company_id
      );
      enqueued++;
    }

    if (config.proactive_sales_alert && config.proactive_summary_hour === currentHour) {
      await enqueueJob(
        "group_proactive",
        { configId: config.id, action: "sales_alert" },
        config.company_id
      );
      enqueued++;
    }
  }

  const sessionsCleared = await cleanExpiredSessions();

  return { enqueued, sessionsCleared };
}
