/**
 * Arquivo: src/lib/cron/group-rag-batch.ts
 * Proposito: Logica do cron de RAG batch para grupo (extraida do route handler).
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processGroupRagBatch } from "@/services/group-agent/rag-feeder";

const LOG_PREFIX = "[cron/group-rag-batch]";

export async function runGroupRagBatchCron() {
  const supabase = createSupabaseAdminClient();

  const { data: configs } = await supabase
    .from("group_agent_configs")
    .select("id, company_id, rag_batch_interval_minutes")
    .eq("is_active", true)
    .eq("feed_to_rag", true);

  if (!configs || configs.length === 0) {
    console.log(LOG_PREFIX, "Nenhuma config ativa com feed_to_rag=true");
    return { processed: 0 };
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

    console.log(LOG_PREFIX, `Config ${config.id}: ${pendingCount} mensagens pendentes, processando`);

    try {
      const result = await processGroupRagBatch(config.company_id, config.id);
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

  return { processed: results.length, totalConfigs: configs.length, results };
}
