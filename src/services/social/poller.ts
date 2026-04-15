/**
 * Arquivo: src/services/social/poller.ts
 * Proposito: Poller local que reserva posts vencidos via RPC atomica e dispara publicacao.
 *            Substitui o disparo via QStash e faz recovery de processing travado.
 * Autor: AXIOMIX
 * Data: 2026-04-15
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishScheduledPost } from "@/services/social/publisher";

const BATCH_SIZE = 20;
const MAX_PARALLEL_PER_COMPANY = 1;

type ClaimedPost = {
  id: string;
  company_id: string;
  attempt_count: number;
};

type PollerResult = {
  picked: number;
  published: number;
  partial: number;
  failed: number;
  errors: number;
};

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return;
  const queue = items.slice();
  const runners: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    runners.push(
      (async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) return;
          await worker(next);
        }
      })()
    );
  }
  await Promise.all(runners);
}

export async function processDueScheduledPosts(): Promise<PollerResult> {
  const supabase = createSupabaseAdminClient();

  const { data: claimed, error } = await supabase.rpc("claim_due_scheduled_posts", {
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    throw new Error(`[social-poller] Falha ao reservar posts vencidos: ${error.message}`);
  }

  const rows: ClaimedPost[] = Array.isArray(claimed) ? (claimed as ClaimedPost[]) : [];

  const result: PollerResult = {
    picked: rows.length,
    published: 0,
    partial: 0,
    failed: 0,
    errors: 0,
  };

  if (rows.length === 0) {
    return result;
  }

  const byCompany = new Map<string, ClaimedPost[]>();
  for (const row of rows) {
    if (!row.id || !row.company_id) continue;
    const bucket = byCompany.get(row.company_id);
    if (bucket) {
      bucket.push(row);
    } else {
      byCompany.set(row.company_id, [row]);
    }
  }

  const publishOne = async (row: ClaimedPost) => {
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
  };

  // Paraleliza entre empresas, serializa dentro de cada empresa (throttle basico).
  await Promise.all(
    Array.from(byCompany.values()).map((companyRows) =>
      runWithConcurrency(companyRows, MAX_PARALLEL_PER_COMPANY, publishOne)
    )
  );

  return result;
}
