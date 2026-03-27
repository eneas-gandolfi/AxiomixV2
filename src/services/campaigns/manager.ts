/**
 * Arquivo: src/services/campaigns/manager.ts
 * Propósito: CRUD e gestao de campanhas em massa de templates WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-27
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Campaign,
  CampaignStats,
  CampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/types/modules/campaigns.types";

function campaignsTable() {
  return createSupabaseAdminClient().from("campaigns");
}

function recipientsTable() {
  return createSupabaseAdminClient().from("campaign_recipients");
}

export class CampaignError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function parseCampaignRow(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: row.name as string,
    template_name: row.template_name as string,
    language: (row.language as string) ?? "pt_BR",
    body_params_template: (row.body_params_template as string[]) ?? [],
    header_params_template: (row.header_params_template as string[]) ?? [],
    inbox_id: row.inbox_id as string,
    status: row.status as Campaign["status"],
    scheduled_at: (row.scheduled_at as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    stats: (row.stats as CampaignStats) ?? { total: 0, sent: 0, failed: 0, skipped: 0 },
    filters: (row.filters as CampaignFilters) ?? {},
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    qstash_message_id: (row.qstash_message_id as string) ?? null,
  };
}

export async function listCampaigns(
  companyId: string,
  page = 1,
  pageSize = 20
): Promise<{ campaigns: Campaign[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await campaignsTable()
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new CampaignError(
      `Falha ao listar campanhas: ${error.message}`,
      "LIST_ERROR",
      500
    );
  }

  return {
    campaigns: (data ?? []).map((row: Record<string, unknown>) => parseCampaignRow(row)),
    total: count ?? 0,
  };
}

export async function getCampaign(
  campaignId: string,
  companyId: string
): Promise<Campaign> {
  const { data, error } = await campaignsTable()
    .select("*")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .single();

  if (error || !data) {
    throw new CampaignError("Campanha não encontrada.", "NOT_FOUND", 404);
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { data, error } = await campaignsTable()
    .insert({
      company_id: input.company_id,
      name: input.name,
      template_name: input.template_name,
      language: input.language ?? "pt_BR",
      body_params_template: input.body_params_template ?? [],
      header_params_template: input.header_params_template ?? [],
      inbox_id: input.inbox_id,
      status: "draft",
      filters: input.filters ?? {},
      scheduled_at: input.scheduled_at ?? null,
      created_by: input.created_by ?? null,
      stats: { total: 0, sent: 0, failed: 0, skipped: 0 },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new CampaignError(
      `Falha ao criar campanha: ${error?.message ?? "sem dados retornados."}`,
      "CREATE_ERROR",
      500
    );
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function updateCampaign(
  campaignId: string,
  companyId: string,
  input: UpdateCampaignInput
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "draft") {
    throw new CampaignError(
      "Somente campanhas em rascunho podem ser editadas.",
      "INVALID_STATUS",
      400
    );
  }

  const { data, error } = await campaignsTable()
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new CampaignError(
      `Falha ao atualizar campanha: ${error?.message ?? "sem dados retornados."}`,
      "UPDATE_ERROR",
      500
    );
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function deleteCampaign(
  campaignId: string,
  companyId: string
): Promise<void> {
  const campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "draft" && campaign.status !== "failed") {
    throw new CampaignError(
      "Somente campanhas em rascunho ou que falharam podem ser excluídas.",
      "INVALID_STATUS",
      400
    );
  }

  const { error } = await campaignsTable()
    .delete()
    .eq("id", campaignId)
    .eq("company_id", companyId);

  if (error) {
    throw new CampaignError(
      `Falha ao excluir campanha: ${error.message}`,
      "DELETE_ERROR",
      500
    );
  }
}

export async function startCampaign(
  campaignId: string,
  companyId: string
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new CampaignError(
      "Somente campanhas em rascunho ou agendadas podem ser iniciadas.",
      "INVALID_STATUS",
      400
    );
  }

  // Verificar se tem recipients
  const { count } = await recipientsTable()
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if (!count || count === 0) {
    throw new CampaignError(
      "A campanha não possui destinatários. Gere a lista antes de iniciar.",
      "NO_RECIPIENTS",
      400
    );
  }

  const { data, error } = await campaignsTable()
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new CampaignError(
      `Falha ao iniciar campanha: ${error?.message ?? "sem dados retornados."}`,
      "START_ERROR",
      500
    );
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function pauseCampaign(
  campaignId: string,
  companyId: string
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "running") {
    throw new CampaignError(
      "Somente campanhas em execução podem ser pausadas.",
      "INVALID_STATUS",
      400
    );
  }

  const { data, error } = await campaignsTable()
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new CampaignError(
      `Falha ao pausar campanha: ${error?.message ?? "sem dados retornados."}`,
      "PAUSE_ERROR",
      500
    );
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function resumeCampaign(
  campaignId: string,
  companyId: string
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId, companyId);

  if (campaign.status !== "paused") {
    throw new CampaignError(
      "Somente campanhas pausadas podem ser retomadas.",
      "INVALID_STATUS",
      400
    );
  }

  const { data, error } = await campaignsTable()
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new CampaignError(
      `Falha ao retomar campanha: ${error?.message ?? "sem dados retornados."}`,
      "RESUME_ERROR",
      500
    );
  }

  return parseCampaignRow(data as Record<string, unknown>);
}

export async function updateCampaignStats(
  campaignId: string,
  stats: CampaignStats
): Promise<void> {
  const { error } = await campaignsTable()
    .update({ stats, updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (error) {
    console.error(`[CAMPAIGN] Falha ao atualizar stats da campanha ${campaignId}:`, error.message);
  }
}

export async function setCampaignCompleted(campaignId: string): Promise<void> {
  const { error } = await campaignsTable()
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    console.error(`[CAMPAIGN] Falha ao finalizar campanha ${campaignId}:`, error.message);
  }
}

export async function setCampaignFailed(
  campaignId: string,
  _reason: string
): Promise<void> {
  const { error } = await campaignsTable()
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (error) {
    console.error(`[CAMPAIGN] Falha ao marcar campanha ${campaignId} como falha:`, error.message);
  }
}
