/**
 * Arquivo: src/app/api/cron/group-rag-batch/route.ts
 * Propósito: Cron job para processar mensagens de grupo em batch para alimentar o RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processGroupRagBatch } from "@/services/group-agent/rag-feeder";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LOG_PREFIX = "[cron/group-rag-batch]";

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
      console.log(LOG_PREFIX, "Nenhuma config ativa com feed_to_rag=true");
      return NextResponse.json({ ok: true, processed: 0, reason: "no_active_configs" });
    }

    console.log(LOG_PREFIX, `Encontradas ${configs.length} config(s) com feed_to_rag=true`);

    const results: Array<{
      configId: string;
      messagesProcessed: number;
      chunksCreated: number;
      ragDocumentId: string | null;
      error?: string;
    }> = [];

    for (const config of configs) {
      const { count } = await supabase
        .from("group_messages")
        .select("id", { count: "exact", head: true })
        .eq("config_id", config.id)
        .eq("company_id", config.company_id)
        .eq("rag_processed", false)
        .not("content", "is", null);

      const pendingCount = count ?? 0;
      if (pendingCount < 3) {
        console.log(LOG_PREFIX, `Config ${config.id}: ${pendingCount} mensagens pendentes (< 3), pulando`);
        continue;
      }

      console.log(LOG_PREFIX, `Config ${config.id}: ${pendingCount} mensagens pendentes, processando inline`);

      try {
        const result = await processGroupRagBatch(config.company_id, config.id);
        console.log(LOG_PREFIX, `Config ${config.id}: processado`, {
          messagesProcessed: result.messagesProcessed,
          chunksCreated: result.chunksCreated,
          ragDocumentId: result.ragDocumentId,
        });
        results.push(result);
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(LOG_PREFIX, `Config ${config.id}: falha ao processar`, detail);
        results.push({
          configId: config.id,
          messagesProcessed: 0,
          chunksCreated: 0,
          ragDocumentId: null,
          error: detail,
        });
      }
    }

    console.log(LOG_PREFIX, "Concluído", {
      totalConfigs: configs.length,
      processed: results.length,
      totalChunks: results.reduce((sum, r) => sum + r.chunksCreated, 0),
    });

    return NextResponse.json({ ok: true, processed: results.length, totalConfigs: configs.length, results });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Erro inesperado.";
    console.error(LOG_PREFIX, "Erro fatal:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
