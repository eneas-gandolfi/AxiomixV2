/**
 * Arquivo: src/app/api/cron/group-rag-batch/route.ts
 * Propósito: Cron job para processar mensagens de grupo em batch para alimentar o RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { error: "Método GET reservado para cron." },
        { status: 405 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: configs } = await supabase
      .from("group_agent_configs")
      .select("id, company_id, rag_batch_interval_minutes")
      .eq("is_active", true)
      .eq("feed_to_rag", true);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0, reason: "no_active_configs" });
    }

    let enqueued = 0;

    for (const config of configs) {
      const { count } = await supabase
        .from("group_messages")
        .select("id", { count: "exact", head: true })
        .eq("config_id", config.id)
        .eq("company_id", config.company_id)
        .eq("rag_processed", false)
        .not("content", "is", null);

      const pendingCount = count ?? 0;
      if (pendingCount < 3) continue;

      const { count: runningJobs } = await supabase
        .from("async_jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", config.company_id)
        .eq("job_type", "group_rag_batch")
        .in("status", ["pending", "running"]);

      if ((runningJobs ?? 0) > 0) continue;

      await enqueueJob(
        "group_rag_batch",
        { configId: config.id },
        config.company_id
      );
      enqueued++;
    }

    return NextResponse.json({ ok: true, enqueued, totalConfigs: configs.length });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
