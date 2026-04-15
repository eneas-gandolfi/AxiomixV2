/**
 * Arquivo: src/lib/cron/group-proactive.ts
 * Proposito: Logica do cron de proatividade de grupo (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { cleanExpiredSessions } from "@/services/group-agent/session-manager";

function startOfUtcDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export async function runGroupProactiveCron() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const currentHour = now.getUTCHours();
  const dayStart = startOfUtcDay(now);

  const { data: configs } = await supabase
    .from("group_agent_configs")
    .select(
      "id, company_id, proactive_summary, proactive_summary_hour, proactive_sales_alert, last_summary_sent_at, last_sales_alert_sent_at"
    )
    .eq("is_active", true)
    .eq("is_hidden", false);

  if (!configs || configs.length === 0) {
    return { enqueued: 0, sessionsCleared: 0 };
  }

  let enqueued = 0;

  for (const config of configs) {
    const scheduledHour = config.proactive_summary_hour ?? 18;
    const windowOpen = currentHour >= scheduledHour;

    const summarySentToday =
      config.last_summary_sent_at &&
      new Date(config.last_summary_sent_at as string) >= dayStart;

    if (config.proactive_summary && windowOpen && !summarySentToday) {
      await enqueueJob(
        "group_proactive",
        { configId: config.id, action: "daily_summary" },
        config.company_id
      );
      enqueued++;
    }

    const alertSentToday =
      config.last_sales_alert_sent_at &&
      new Date(config.last_sales_alert_sent_at as string) >= dayStart;

    if (config.proactive_sales_alert && windowOpen && !alertSentToday) {
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
