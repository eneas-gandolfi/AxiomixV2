/**
 * Arquivo: src/services/evo-crm/directory-cache.ts
 * Propósito: Cache de leitura para o "diretório" do Evo CRM (agents/users e
 *            inboxes), dados quase-estáticos usados em filtros e selects da
 *            UI. Evita chamadas HTTP live ao Evo CRM no caminho de render.
 *            Staleness de até 5min; invalidação explícita via tag por company.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

import "server-only";

import { unstable_cache } from "next/cache";
import { getEvoCrmClient } from "./client";
import type { EvoInboxApi, EvoUserApi } from "./types";

const REVALIDATE_SECONDS = 300;

export const evoAgentsTag = (companyId: string) => `evo-agents-${companyId}`;
export const evoInboxesTag = (companyId: string) => `evo-inboxes-${companyId}`;

/**
 * Lista os users/agentes do Evo CRM com cache de 5min por company.
 *
 * Usa `getEvoCrmClient` (admin client, sem cookies — `unstable_cache` não
 * aceita runtime APIs no callback). Em falha a função LANÇA: `unstable_cache`
 * não cacheia erros, então a degradação para lista vazia fica no caller.
 */
export async function getCachedEvoAgents(companyId: string): Promise<EvoUserApi[]> {
  return unstable_cache(
    async () => {
      const client = await getEvoCrmClient(companyId);
      return client.listUsers();
    },
    ["evo-directory-agents", companyId],
    { revalidate: REVALIDATE_SECONDS, tags: [evoAgentsTag(companyId)] },
  )();
}

/**
 * Lista os inboxes do Evo CRM com cache de 5min por company.
 * Mesmas garantias de `getCachedEvoAgents`.
 */
export async function getCachedEvoInboxes(companyId: string): Promise<EvoInboxApi[]> {
  return unstable_cache(
    async () => {
      const client = await getEvoCrmClient(companyId);
      return client.listInboxes();
    },
    ["evo-directory-inboxes", companyId],
    { revalidate: REVALIDATE_SECONDS, tags: [evoInboxesTag(companyId)] },
  )();
}
