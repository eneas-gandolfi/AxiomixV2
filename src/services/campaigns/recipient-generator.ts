/**
 * Arquivo: src/services/campaigns/recipient-generator.ts
 * Propósito: Gerar e gerenciar lista de destinatarios de uma campanha a partir de filtros.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSofiaCrmClient } from "@/services/sofia-crm/client";
import { getCampaign, updateCampaignStats } from "@/services/campaigns/manager";
import type { CampaignFilters, CampaignRecipient, DeliveryStatus, RecipientStatus } from "@/types/modules/campaigns.types";

function recipientsTable() {
  return createSupabaseAdminClient().from("campaign_recipients");
}

const SOFIA_CONTACTS_PAGE_SIZE = 50;

type GenerateResult = {
  generated: number;
  skipped: number;
};

type SofiaContactForFilter = {
  id: string;
  name?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  gender?: string | null;
  created_at?: string | null;
  labels?: Array<{ id: string; name?: string | null }> | null;
};

function parseSofiaDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchesFilters(contact: SofiaContactForFilter, filters: CampaignFilters): boolean {
  if (filters.labelIds && filters.labelIds.length > 0) {
    const contactLabelIds = (contact.labels ?? []).map((l) => String(l.id));
    const hasLabel = filters.labelIds.some((id) => contactLabelIds.includes(id));
    if (!hasLabel) return false;
  }

  if (filters.gender && contact.gender) {
    if (contact.gender.toUpperCase() !== filters.gender.toUpperCase()) return false;
  }

  const createdAt = parseSofiaDate(contact.created_at);

  if (filters.createdAfter && createdAt) {
    if (createdAt < new Date(filters.createdAfter)) return false;
  }

  if (filters.createdBefore && createdAt) {
    if (createdAt > new Date(filters.createdBefore)) return false;
  }

  return true;
}

export async function generateRecipients(
  campaignId: string,
  companyId: string
): Promise<GenerateResult> {
  const campaign = await getCampaign(campaignId, companyId);
  const sofiaClient = await getSofiaCrmClient(companyId);
  const filters = campaign.filters;

  // Limpar recipients pendentes anteriores para permitir re-geração
  await recipientsTable()
    .delete()
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  const seenPhones = new Set<string>();
  let generated = 0;
  let skipped = 0;

  // Se importedPhones presente, usar lista direta em vez de paginar o CRM
  if (filters.importedPhones && filters.importedPhones.length > 0) {
    const insertRows: Array<{
      campaign_id: string;
      contact_id: string;
      contact_name: string | null;
      contact_phone: string;
      status: string;
      variables: Record<string, string>;
    }> = [];

    for (let i = 0; i < filters.importedPhones.length; i++) {
      const phone = filters.importedPhones[i];
      if (seenPhones.has(phone)) { skipped++; continue; }
      seenPhones.add(phone);

      let contactName = "";
      let contactId = phone;
      let email = "";

      try {
        const existing = await sofiaClient.findContactByPhone(phone);
        if (existing) {
          contactName = existing.name ?? "";
          contactId = String(existing.id);
          email = existing.email ?? "";
        }
      } catch {
        // Nao falhar se busca nao funcionar
      }

      insertRows.push({
        campaign_id: campaignId,
        contact_id: contactId,
        contact_name: contactName || null,
        contact_phone: phone,
        status: "pending",
        variables: { name: contactName, phone, email },
      });

      // Rate limit a cada 10 buscas
      if ((i + 1) % 10 === 0) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (insertRows.length > 0) {
      const { error } = await recipientsTable()
        .upsert(insertRows, { onConflict: "campaign_id,contact_phone", ignoreDuplicates: true });
      if (error) {
        console.error(`[CAMPAIGN] Falha ao inserir recipients importados:`, error.message);
      } else {
        generated = insertRows.length;
      }
    }

    // Atualizar stats.total
    const { count } = await recipientsTable()
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    await updateCampaignStats(campaignId, {
      total: count ?? generated,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    return { generated, skipped };
  }

  // Fluxo padrao: paginar contatos do CRM com filtros
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const contacts = await sofiaClient.listContacts({
      page,
      limit: SOFIA_CONTACTS_PAGE_SIZE,
      include_labels: !!(filters.labelIds && filters.labelIds.length > 0),
    });

    if (contacts.length === 0) {
      hasMore = false;
      break;
    }

    const insertRows: Array<{
      campaign_id: string;
      contact_id: string;
      contact_name: string | null;
      contact_phone: string;
      status: string;
      variables: Record<string, string>;
    }> = [];

    for (const contact of contacts as SofiaContactForFilter[]) {
      const phone = contact.phone_e164 ?? contact.phone;
      if (!phone) {
        skipped++;
        continue;
      }

      if (seenPhones.has(phone)) {
        skipped++;
        continue;
      }

      if (!matchesFilters(contact, filters)) {
        skipped++;
        continue;
      }

      seenPhones.add(phone);
      insertRows.push({
        campaign_id: campaignId,
        contact_id: String(contact.id),
        contact_name: contact.name ?? null,
        contact_phone: phone,
        status: "pending",
        variables: {
          name: contact.name ?? "",
          phone,
          email: contact.email ?? "",
        },
      });
    }

    if (insertRows.length > 0) {
      const { error } = await recipientsTable()
        .upsert(insertRows, { onConflict: "campaign_id,contact_phone", ignoreDuplicates: true });

      if (error) {
        console.error(`[CAMPAIGN] Falha ao inserir recipients página ${page}:`, error.message);
      } else {
        generated += insertRows.length;
      }
    }

    if (contacts.length < SOFIA_CONTACTS_PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
    }

    // Delay entre páginas para respeitar rate limit do Sofia
    await new Promise((r) => setTimeout(r, 300));
  }

  // Atualizar stats.total
  const { count } = await recipientsTable()
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await updateCampaignStats(campaignId, {
    total: count ?? generated,
    sent: 0,
    failed: 0,
    skipped: 0,
  });

  return { generated, skipped };
}

export async function listRecipients(
  campaignId: string,
  page = 1,
  pageSize = 20,
  statusFilter?: RecipientStatus
): Promise<{ recipients: CampaignRecipient[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = recipientsTable()
    .select("*", { count: "exact" })
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(`Falha ao listar destinatários: ${error.message}`);
  }

  const recipients: CampaignRecipient[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    campaign_id: row.campaign_id as string,
    contact_id: row.contact_id as string,
    contact_name: (row.contact_name as string) ?? null,
    contact_phone: row.contact_phone as string,
    status: row.status as RecipientStatus,
    sent_at: (row.sent_at as string) ?? null,
    error_message: (row.error_message as string) ?? null,
    variables: (row.variables as Record<string, string>) ?? {},
    created_at: row.created_at as string,
    delivery_status: (row.delivery_status as DeliveryStatus) ?? null,
    delivery_updated_at: (row.delivery_updated_at as string) ?? null,
    provider_message_id: (row.provider_message_id as string) ?? null,
  }));

  return { recipients, total: count ?? 0 };
}

export async function getRecipientCount(campaignId: string): Promise<number> {
  const { count } = await recipientsTable()
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  return count ?? 0;
}
