/**
 * Arquivo: src/services/social/content-demands.ts
 * Propósito: Lógica de negócio do workflow de aprovação de conteúdo (demandas).
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/database/types/database.types";
import type { SocialPlatform } from "@/types/modules/social-publisher.types";
import {
  ALLOWED_TRANSITIONS,
  type ContentDemand,
  type ContentDemandWithMeta,
  type DemandComment,
  type DemandCreateInput,
  type DemandHistoryEntry,
  type DemandStatus,
  type DemandUpdateInput,
} from "@/types/modules/content-demands.types";

export class ContentDemandError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const SUPPORTED_PLATFORMS = new Set<string>(["instagram", "linkedin", "tiktok", "facebook"]);

function parsePlatforms(raw: Json): SocialPlatform[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is SocialPlatform => typeof v === "string" && SUPPORTED_PLATFORMS.has(v)
  );
}

function toDemand(row: {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  platforms: Json;
  due_date: string | null;
  status: string;
  media_file_ids: string[];
  caption: string | null;
  scheduled_post_id: string | null;
  approval_token: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}): ContentDemand {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    assignedTo: row.assigned_to,
    platforms: parsePlatforms(row.platforms),
    dueDate: row.due_date,
    status: row.status as DemandStatus,
    mediaFileIds: row.media_file_ids ?? [],
    caption: row.caption,
    scheduledPostId: row.scheduled_post_id,
    approvalToken: row.approval_token,
    createdBy: row.created_by,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

const DEMAND_SELECT =
  "id, company_id, title, description, assigned_to, platforms, due_date, status, media_file_ids, caption, scheduled_post_id, approval_token, created_by, created_at, updated_at";

export async function createDemand(input: DemandCreateInput): Promise<ContentDemand> {
  if (!input.title.trim()) {
    throw new ContentDemandError("Título é obrigatório.", "DEMAND_TITLE_REQUIRED", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("content_demands")
    .insert({
      company_id: input.companyId,
      title: input.title.trim(),
      description: input.description ?? null,
      assigned_to: input.assignedTo ?? null,
      platforms: (input.platforms ?? []) as unknown as Json,
      due_date: input.dueDate ?? null,
      caption: input.caption ?? null,
      media_file_ids: input.mediaFileIds ?? [],
      created_by: input.createdBy,
      status: "rascunho",
    })
    .select(DEMAND_SELECT)
    .single();

  if (error) {
    throw new ContentDemandError("Falha ao criar demanda.", "DEMAND_CREATE_ERROR", 500);
  }

  return toDemand(data);
}

type ListDemandsInput = {
  companyId: string;
  page: number;
  pageSize?: number;
  status?: DemandStatus;
  assignedTo?: string;
  platform?: SocialPlatform;
};

type ListDemandsResult = {
  items: ContentDemandWithMeta[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listDemands(input: ListDemandsInput): Promise<ListDemandsResult> {
  const supabase = createSupabaseAdminClient();
  const pageSize = input.pageSize ?? 20;
  const start = (input.page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from("content_demands")
    .select(DEMAND_SELECT, { count: "exact" })
    .eq("company_id", input.companyId)
    .order("created_at", { ascending: false })
    .range(start, end);

  if (input.status) {
    query = query.eq("status", input.status);
  }
  if (input.assignedTo) {
    query = query.eq("assigned_to", input.assignedTo);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    throw new ContentDemandError("Falha ao listar demandas.", "DEMAND_LIST_ERROR", 500);
  }

  const demands = (rows ?? []).map(toDemand);

  // Enrich with user names and comment counts
  const userIds = new Set<string>();
  for (const d of demands) {
    if (d.assignedTo) userIds.add(d.assignedTo);
    userIds.add(d.createdBy);
  }

  let userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", Array.from(userIds));
    userMap = new Map((users ?? []).map((u) => [u.id, u.full_name ?? ""]));
  }

  // Get comment counts
  const demandIds = demands.map((d) => d.id);
  let commentMap = new Map<string, number>();
  if (demandIds.length > 0) {
    const { data: commentRows } = await supabase
      .from("demand_comments")
      .select("demand_id")
      .in("demand_id", demandIds);

    for (const row of commentRows ?? []) {
      commentMap.set(row.demand_id, (commentMap.get(row.demand_id) ?? 0) + 1);
    }
  }

  // Get thumbnails
  const thumbnailIds = demands
    .map((d) => d.mediaFileIds[0])
    .filter((id): id is string => typeof id === "string");

  let thumbnailMap = new Map<string, string>();
  if (thumbnailIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("media_files")
      .select("id, public_url")
      .in("id", thumbnailIds);
    thumbnailMap = new Map((mediaRows ?? []).map((m) => [m.id, m.public_url]));
  }

  const items: ContentDemandWithMeta[] = demands.map((d) => ({
    ...d,
    assigneeName: d.assignedTo ? (userMap.get(d.assignedTo) ?? null) : null,
    creatorName: userMap.get(d.createdBy) ?? null,
    commentCount: commentMap.get(d.id) ?? 0,
    thumbnailUrl: thumbnailMap.get(d.mediaFileIds[0] ?? "") ?? null,
  }));

  // Filter by platform client-side (jsonb contains)
  const filtered = input.platform
    ? items.filter((d) => d.platforms.includes(input.platform!))
    : items;

  const total = count ?? 0;
  return {
    items: filtered,
    page: input.page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getDemand(
  companyId: string,
  demandId: string
): Promise<{
  demand: ContentDemandWithMeta;
  comments: DemandComment[];
  history: DemandHistoryEntry[];
}> {
  const supabase = createSupabaseAdminClient();

  const { data: row, error } = await supabase
    .from("content_demands")
    .select(DEMAND_SELECT)
    .eq("id", demandId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !row) {
    throw new ContentDemandError("Demanda não encontrada.", "DEMAND_NOT_FOUND", 404);
  }

  const demand = toDemand(row);

  // Get user names
  const userIds = new Set<string>();
  if (demand.assignedTo) userIds.add(demand.assignedTo);
  userIds.add(demand.createdBy);

  // Get comments
  const { data: commentRows } = await supabase
    .from("demand_comments")
    .select("id, demand_id, user_id, author_name, content, created_at")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: true });

  for (const c of commentRows ?? []) {
    if (c.user_id) userIds.add(c.user_id);
  }

  // Get history
  const { data: historyRows } = await supabase
    .from("demand_history")
    .select("id, demand_id, user_id, from_status, to_status, comment, created_at")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: true });

  for (const h of historyRows ?? []) {
    if (h.user_id) userIds.add(h.user_id);
  }

  // Resolve user names
  let userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", Array.from(userIds));
    userMap = new Map((users ?? []).map((u) => [u.id, u.full_name ?? ""]));
  }

  // Get comment count
  const commentCount = (commentRows ?? []).length;

  // Get thumbnail
  let thumbnailUrl: string | null = null;
  if (demand.mediaFileIds[0]) {
    const { data: media } = await supabase
      .from("media_files")
      .select("public_url")
      .eq("id", demand.mediaFileIds[0])
      .maybeSingle();
    thumbnailUrl = media?.public_url ?? null;
  }

  const demandWithMeta: ContentDemandWithMeta = {
    ...demand,
    assigneeName: demand.assignedTo ? (userMap.get(demand.assignedTo) ?? null) : null,
    creatorName: userMap.get(demand.createdBy) ?? null,
    commentCount,
    thumbnailUrl,
  };

  const comments: DemandComment[] = (commentRows ?? []).map((c) => ({
    id: c.id,
    demandId: c.demand_id,
    userId: c.user_id,
    authorName: c.author_name,
    content: c.content,
    createdAt: c.created_at ?? new Date().toISOString(),
    userName: c.user_id ? (userMap.get(c.user_id) ?? null) : null,
  }));

  const history: DemandHistoryEntry[] = (historyRows ?? []).map((h) => ({
    id: h.id,
    demandId: h.demand_id,
    fromStatus: h.from_status as DemandStatus,
    toStatus: h.to_status as DemandStatus,
    comment: h.comment,
    createdAt: h.created_at ?? new Date().toISOString(),
    userName: h.user_id ? (userMap.get(h.user_id) ?? null) : null,
  }));

  return { demand: demandWithMeta, comments, history };
}

export async function updateDemand(
  companyId: string,
  demandId: string,
  input: DemandUpdateInput
): Promise<ContentDemand> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
  if (input.platforms !== undefined) updateData.platforms = input.platforms;
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
  if (input.caption !== undefined) updateData.caption = input.caption;
  if (input.mediaFileIds !== undefined) updateData.media_file_ids = input.mediaFileIds;

  const { data, error } = await supabase
    .from("content_demands")
    .update(updateData)
    .eq("id", demandId)
    .eq("company_id", companyId)
    .select(DEMAND_SELECT)
    .single();

  if (error) {
    throw new ContentDemandError("Falha ao atualizar demanda.", "DEMAND_UPDATE_ERROR", 500);
  }

  return toDemand(data);
}

export async function transitionStatus(
  companyId: string,
  demandId: string,
  userId: string,
  toStatus: DemandStatus,
  comment?: string
): Promise<ContentDemand> {
  const supabase = createSupabaseAdminClient();

  // Get current demand
  const { data: row, error } = await supabase
    .from("content_demands")
    .select(DEMAND_SELECT)
    .eq("id", demandId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !row) {
    throw new ContentDemandError("Demanda não encontrada.", "DEMAND_NOT_FOUND", 404);
  }

  const currentStatus = row.status as DemandStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(toStatus)) {
    throw new ContentDemandError(
      `Transição de '${currentStatus}' para '${toStatus}' não é permitida.`,
      "INVALID_TRANSITION",
      409
    );
  }

  // Record history
  await supabase.from("demand_history").insert({
    demand_id: demandId,
    user_id: userId,
    from_status: currentStatus,
    to_status: toStatus,
    comment: comment ?? null,
  });

  // If requesting changes, add a comment automatically
  if (toStatus === "alteracoes_solicitadas" && comment) {
    await supabase.from("demand_comments").insert({
      demand_id: demandId,
      user_id: userId,
      content: comment,
    });
  }

  // Update status
  const { data: updated, error: updateError } = await supabase
    .from("content_demands")
    .update({ status: toStatus })
    .eq("id", demandId)
    .eq("company_id", companyId)
    .select(DEMAND_SELECT)
    .single();

  if (updateError) {
    throw new ContentDemandError("Falha ao transicionar status.", "TRANSITION_ERROR", 500);
  }

  return toDemand(updated);
}

export async function generateApprovalToken(
  companyId: string,
  demandId: string
): Promise<{ token: string; expiresAt: string }> {
  const supabase = createSupabaseAdminClient();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("content_demands")
    .update({
      approval_token: token,
      approval_token_expires_at: expiresAt,
    })
    .eq("id", demandId)
    .eq("company_id", companyId);

  if (error) {
    throw new ContentDemandError(
      "Falha ao gerar token de aprovação.",
      "APPROVAL_TOKEN_ERROR",
      500
    );
  }

  return { token, expiresAt };
}

export async function approveViaToken(
  token: string,
  action: "aprovado" | "alteracoes_solicitadas",
  comment?: string
): Promise<ContentDemand> {
  const supabase = createSupabaseAdminClient();

  const { data: row, error } = await supabase
    .from("content_demands")
    .select("id, company_id, title, description, assigned_to, platforms, due_date, status, media_file_ids, caption, scheduled_post_id, approval_token, approval_token_expires_at, created_by, created_at, updated_at")
    .eq("approval_token", token)
    .maybeSingle();

  if (error || !row) {
    throw new ContentDemandError("Token de aprovação inválido.", "INVALID_APPROVAL_TOKEN", 404);
  }

  if (
    row.approval_token_expires_at &&
    new Date(row.approval_token_expires_at).getTime() < Date.now()
  ) {
    throw new ContentDemandError("Token de aprovação expirado.", "EXPIRED_APPROVAL_TOKEN", 410);
  }

  if (row.status !== "em_revisao") {
    throw new ContentDemandError(
      "Esta demanda não está em revisão.",
      "INVALID_DEMAND_STATUS",
      409
    );
  }

  // Record history
  await supabase.from("demand_history").insert({
    demand_id: row.id,
    from_status: row.status,
    to_status: action,
    comment: comment ?? "Aprovação via link externo",
  });

  // Add comment if requesting changes
  if (action === "alteracoes_solicitadas" && comment) {
    await supabase.from("demand_comments").insert({
      demand_id: row.id,
      author_name: "Aprovador Externo",
      content: comment,
    });
  }

  // Update status and clear token — atomic guard via status check to prevent race condition
  const { data: updated, error: updateError } = await supabase
    .from("content_demands")
    .update({
      status: action,
      approval_token: null,
      approval_token_expires_at: null,
    })
    .eq("id", row.id)
    .eq("status", "em_revisao")
    .select(DEMAND_SELECT)
    .maybeSingle();

  if (updateError) {
    throw new ContentDemandError("Falha ao processar aprovação.", "APPROVAL_ERROR", 500);
  }

  if (!updated) {
    throw new ContentDemandError(
      "Esta demanda já foi processada.",
      "ALREADY_PROCESSED",
      409
    );
  }

  return toDemand(updated);
}

export async function addComment(
  demandId: string,
  userId: string,
  content: string
): Promise<DemandComment> {
  if (!content.trim()) {
    throw new ContentDemandError("Conteúdo do comentário é obrigatório.", "COMMENT_EMPTY", 400);
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("demand_comments")
    .insert({
      demand_id: demandId,
      user_id: userId,
      content: content.trim(),
    })
    .select("id, demand_id, user_id, author_name, content, created_at")
    .single();

  if (error) {
    throw new ContentDemandError("Falha ao adicionar comentário.", "COMMENT_ERROR", 500);
  }

  return {
    id: data.id,
    demandId: data.demand_id,
    userId: data.user_id,
    authorName: data.author_name,
    content: data.content,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

export async function deleteDemand(companyId: string, demandId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("content_demands")
    .delete()
    .eq("id", demandId)
    .eq("company_id", companyId);

  if (error) {
    throw new ContentDemandError("Falha ao excluir demanda.", "DEMAND_DELETE_ERROR", 500);
  }
}
