/**
 * Arquivo: src/services/social/hashtag-groups.ts
 * Propósito: CRUD de grupos de hashtags para o Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { HashtagGroup, HashtagGroupInput } from "@/types/modules/social-publisher.types";

export class HashtagGroupError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function normalizeHashtags(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of raw) {
    const trimmed = tag.trim();
    if (!trimmed) continue;

    const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    const lower = normalized.toLowerCase();

    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(normalized);
    }
  }

  return result;
}

function toHashtagGroup(row: {
  id: string;
  company_id: string;
  name: string;
  hashtags: string[];
  created_at: string | null;
  updated_at: string | null;
}): HashtagGroup {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    hashtags: row.hashtags,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export async function listHashtagGroups(companyId: string): Promise<HashtagGroup[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("hashtag_groups")
    .select("id, company_id, name, hashtags, created_at, updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HashtagGroupError(
      "Falha ao carregar grupos de hashtags.",
      "HASHTAG_GROUPS_LIST_ERROR",
      500
    );
  }

  return (data ?? []).map(toHashtagGroup);
}

export async function createHashtagGroup(
  companyId: string,
  input: HashtagGroupInput
): Promise<HashtagGroup> {
  if (!input.name.trim()) {
    throw new HashtagGroupError("Nome do grupo é obrigatório.", "HASHTAG_GROUP_NAME_REQUIRED", 400);
  }

  const hashtags = normalizeHashtags(input.hashtags);
  if (hashtags.length === 0) {
    throw new HashtagGroupError(
      "Informe ao menos uma hashtag.",
      "HASHTAG_GROUP_EMPTY",
      400
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("hashtag_groups")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      hashtags,
    })
    .select("id, company_id, name, hashtags, created_at, updated_at")
    .single();

  if (error) {
    throw new HashtagGroupError(
      "Falha ao criar grupo de hashtags.",
      "HASHTAG_GROUP_CREATE_ERROR",
      500
    );
  }

  return toHashtagGroup(data);
}

export async function updateHashtagGroup(
  companyId: string,
  groupId: string,
  input: HashtagGroupInput
): Promise<HashtagGroup> {
  if (!input.name.trim()) {
    throw new HashtagGroupError("Nome do grupo é obrigatório.", "HASHTAG_GROUP_NAME_REQUIRED", 400);
  }

  const hashtags = normalizeHashtags(input.hashtags);
  if (hashtags.length === 0) {
    throw new HashtagGroupError(
      "Informe ao menos uma hashtag.",
      "HASHTAG_GROUP_EMPTY",
      400
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("hashtag_groups")
    .update({ name: input.name.trim(), hashtags })
    .eq("id", groupId)
    .eq("company_id", companyId)
    .select("id, company_id, name, hashtags, created_at, updated_at")
    .single();

  if (error) {
    throw new HashtagGroupError(
      "Falha ao atualizar grupo de hashtags.",
      "HASHTAG_GROUP_UPDATE_ERROR",
      500
    );
  }

  return toHashtagGroup(data);
}

export async function deleteHashtagGroup(
  companyId: string,
  groupId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("hashtag_groups")
    .delete()
    .eq("id", groupId)
    .eq("company_id", companyId);

  if (error) {
    throw new HashtagGroupError(
      "Falha ao excluir grupo de hashtags.",
      "HASHTAG_GROUP_DELETE_ERROR",
      500
    );
  }
}
