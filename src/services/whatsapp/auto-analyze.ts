/**
 * Arquivo: src/services/whatsapp/auto-analyze.ts
 * Propósito: Enfileirar análises automáticas para conversas sem insight ou com insight desatualizado.
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueJob } from "@/lib/jobs/queue";

type AutoAnalyzeResult = {
  scannedConversations: number;
  enqueuedAnalyses: number;
  jobIds: string[];
};

/**
 * Enfileira análises para conversas que ainda não têm insight.
 * Prioriza conversas mais recentes e limita a 10 análises por vez para evitar sobrecarga.
 */
export async function enqueueAutoAnalyses(companyId: string): Promise<AutoAnalyzeResult> {
  const supabase = createSupabaseAdminClient();

  // Buscar conversas sem insight, ordenadas por data mais recente
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, last_message_at")
    .eq("company_id", companyId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (conversationsError || !conversations) {
    throw new Error(`Falha ao buscar conversas para análise: ${conversationsError?.message}`);
  }

  if (conversations.length === 0) {
    return {
      scannedConversations: 0,
      enqueuedAnalyses: 0,
      jobIds: [],
    };
  }

  const conversationIds = conversations.map((c) => c.id);

  // Verificar quais já têm insight e quando foi gerado
  const { data: existingInsights, error: insightsError } = await supabase
    .from("conversation_insights")
    .select("conversation_id, generated_at")
    .eq("company_id", companyId)
    .in("conversation_id", conversationIds);

  if (insightsError) {
    throw new Error(`Falha ao verificar insights existentes: ${insightsError.message}`);
  }

  const insightMap = new Map(
    (existingInsights ?? []).map((i) => [i.conversation_id, i.generated_at])
  );
  const needsAnalysis = conversations.filter((c) => {
    const generatedAt = insightMap.get(c.id);
    if (!generatedAt) return true; // Sem insight
    if (!c.last_message_at) return false;
    return new Date(c.last_message_at) > new Date(generatedAt); // Insight desatualizado
  });

  // Limitar a 10 análises por execução para não sobrecarregar
  const toAnalyze = needsAnalysis.slice(0, 10);
  const jobIds: string[] = [];

  for (const conversation of toAnalyze) {
    // Verificar se já não há um job pendente/running para esta conversa
    const { data: existingJobs } = await supabase
      .from("async_jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_type", "whatsapp_analyze")
      .eq("payload->conversationId", conversation.id)
      .in("status", ["pending", "running"])
      .limit(1);

    if (existingJobs && existingJobs.length > 0) {
      continue; // Já tem um job em andamento
    }

    try {
      const job = await enqueueJob(
        "whatsapp_analyze",
        { conversationId: conversation.id },
        companyId
      );
      jobIds.push(job.id);
    } catch (error) {
      // Log mas não falha todo o processo se uma análise individual falhar ao enfileirar
      console.error(`Falha ao enfileirar análise para conversa ${conversation.id}:`, error);
    }
  }

  return {
    scannedConversations: conversations.length,
    enqueuedAnalyses: jobIds.length,
    jobIds,
  };
}
