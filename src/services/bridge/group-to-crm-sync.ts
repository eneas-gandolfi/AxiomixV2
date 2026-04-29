/**
 * Arquivo: src/services/bridge/group-to-crm-sync.ts
 * Propósito: Sincronizar notas de alta relevância do Group Agent para o Evo CRM
 *            (labels em contatos e prioridade em conversas).
 * Autor: AXIOMIX
 * Data: 2026-04-29
 */

import "server-only";

import { getEvoCrmClient } from "@/services/evo-crm/client";
import type { AgentNoteCategory } from "@/types/modules/group-agent.types";

const CATEGORY_TO_LABEL: Partial<Record<AgentNoteCategory, string>> = {
  contact_info: "info-capturada",
  action_item: "acao-pendente",
  decision: "decisao-registrada",
};

const MIN_RELEVANCE_SCORE = 0.8;

export async function syncHighRelevanceNoteToCrm(input: {
  companyId: string;
  category: AgentNoteCategory;
  content: string;
  relevanceScore: number;
  sourceSender: string | null;
  contactPhone: string | null;
}): Promise<boolean> {
  if (input.relevanceScore < MIN_RELEVANCE_SCORE) return false;

  const label = CATEGORY_TO_LABEL[input.category];
  if (!label) return false;

  if (!input.contactPhone) {
    console.log("[bridge/group-to-crm] Sem telefone de contato, pulando sync", {
      category: input.category,
    });
    return false;
  }

  try {
    const client = await getEvoCrmClient(input.companyId);

    // Tentar encontrar contato no Evo CRM pelo telefone
    const contact = await client.findContactByPhone(input.contactPhone);
    if (!contact) {
      console.log("[bridge/group-to-crm] Contato não encontrado no Evo CRM", {
        phone: input.contactPhone,
      });
      return false;
    }

    // Adicionar label ao contato
    await client.addContactLabel({ contactId: contact.id, label });

    console.log("[bridge/group-to-crm] Label adicionada ao contato", {
      contactId: contact.id,
      label,
      category: input.category,
    });

    return true;
  } catch (err) {
    console.error(
      "[bridge/group-to-crm] Erro ao sincronizar nota (best-effort):",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
