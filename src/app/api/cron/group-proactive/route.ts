/**
 * Arquivo: src/app/api/cron/group-proactive/route.ts
 * Proposito: Cron endpoint para enfileirar jobs proativos do agente de grupo.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";
import { cleanExpiredSessions } from "@/services/group-agent/session-manager";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Endpoint reservado para cron.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  after(async () => {
    try {
      const result = await runGroupProactiveCron();
      console.log("[group-proactive cron] Resultado:", JSON.stringify(result));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro inesperado.";
      console.error("[group-proactive cron] Erro:", detail);
    }
  });

  return NextResponse.json({ ok: true, message: "Group proactive cron iniciado em background." });
}

async function runGroupProactiveCron() {
  const supabase = createSupabaseAdminClient();
  const currentHour = new Date().getUTCHours();

  // Buscar configs com proatividade habilitada
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
    // Resumo diario: so enfileira na hora configurada
    if (config.proactive_summary && config.proactive_summary_hour === currentHour) {
      await enqueueJob(
        "group_proactive",
        { configId: config.id, action: "daily_summary" },
        config.company_id
      );
      enqueued++;
    }

    // Alerta de vendas: roda uma vez por dia (mesmo horario do resumo)
    if (config.proactive_sales_alert && config.proactive_summary_hour === currentHour) {
      await enqueueJob(
        "group_proactive",
        { configId: config.id, action: "sales_alert" },
        config.company_id
      );
      enqueued++;
    }
  }

  // Limpar sessoes expiradas (housekeeping)
  const sessionsCleared = await cleanExpiredSessions();

  return { enqueued, sessionsCleared };
}
