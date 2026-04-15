/**
 * Arquivo: src/services/social/poller.ts
 * Proposito: Poller local que varre scheduled_posts vencidos e dispara a publicacao.
 *            Substitui o disparo via QStash — executado pelo cron node-cron interno.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishScheduledPost } from "@/services/social/publisher";

const BATCH_SIZE = 20;

type PollerResult = {
  picked: number;
  published: number;
  partial: number;
  failed: number;
  errors: number;
};

export async function processDueScheduledPosts(): Promise<PollerResult> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("scheduled_posts")
    .select("id, company_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(`[social-poller] Falha ao buscar posts vencidos: ${error.message}`);
  }

  const result: PollerResult = {
    picked: due?.length ?? 0,
    published: 0,
    partial: 0,
    failed: 0,
    errors: 0,
  };

  if (!due || due.length === 0) {
    return result;
  }

  for (const row of due) {
    if (!row.id || !row.company_id) {
      continue;
    }

    try {
      const outcome = await publishScheduledPost({
        scheduledPostId: row.id,
        expectedCompanyId: row.company_id,
      });

      if (outcome.status === "published") result.published += 1;
      else if (outcome.status === "partial") result.partial += 1;
      else if (outcome.status === "failed") result.failed += 1;
    } catch (err) {
      result.errors += 1;
      const detail = err instanceof Error ? err.message : "erro desconhecido";
      console.error(`[social-poller] Erro ao publicar ${row.id}:`, detail);
    }
  }

  return result;
}
