import type { Json } from "@/database/types/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ExclusionCandidate = {
  external_id: string | null;
};

const SETTINGS_ROOT_KEY = "whatsapp";
const SETTINGS_EXTERNAL_IDS_KEY = "excludedConversationExternalIds";

function isMissingExclusionsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";

  return code === "PGRST205" || message.includes("conversation_exclusions");
}

function parseSettingsObject(value: Json | null | undefined) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {} as Record<string, Json>;
  }

  return { ...value } as Record<string, Json>;
}

function getExcludedIdsFromSettings(settings: Json | null | undefined): string[] {
  const root = parseSettingsObject(settings);
  const whatsappSettings = parseSettingsObject(root[SETTINGS_ROOT_KEY] ?? null);
  const rawIds = whatsappSettings[SETTINGS_EXTERNAL_IDS_KEY];

  if (!Array.isArray(rawIds)) {
    return [];
  }

  return rawIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mergeExcludedIdsIntoSettings(settings: Json | null | undefined, externalIds: string[]) {
  const root = parseSettingsObject(settings);
  const whatsappSettings = parseSettingsObject(root[SETTINGS_ROOT_KEY] ?? null);
  const currentIds = getExcludedIdsFromSettings(settings);
  const mergedIds = Array.from(new Set([...currentIds, ...externalIds]));

  return {
    ...root,
    [SETTINGS_ROOT_KEY]: {
      ...whatsappSettings,
      [SETTINGS_EXTERNAL_IDS_KEY]: mergedIds,
    },
  } as Json;
}

async function getCompanySettings(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("companies")
    .select("settings")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar configuracoes da empresa: ${error.message}`);
  }

  return data?.settings ?? null;
}

async function getExcludedConversationExternalIdsFromSettings(companyId: string) {
  const settings = await getCompanySettings(companyId);
  return new Set(getExcludedIdsFromSettings(settings));
}

async function saveExcludedConversationExternalIdsToSettings(companyId: string, externalIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const currentSettings = await getCompanySettings(companyId);
  const nextSettings = mergeExcludedIdsIntoSettings(currentSettings, externalIds);

  const { error } = await supabase
    .from("companies")
    .update({ settings: nextSettings })
    .eq("id", companyId);

  if (error) {
    throw new Error(`Falha ao salvar exclusoes de conversas nas configuracoes: ${error.message}`);
  }
}

export async function getExcludedConversationExternalIds(
  companyId: string,
  externalIds?: string[]
): Promise<Set<string>> {
  const requestedIds = externalIds?.filter(Boolean) ?? [];
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("conversation_exclusions")
    .select("external_id")
    .eq("company_id", companyId);

  if (requestedIds.length > 0) {
    query = query.in("external_id", requestedIds);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingExclusionsTableError(error)) {
      const excludedIds = await getExcludedConversationExternalIdsFromSettings(companyId);

      if (requestedIds.length === 0) {
        return excludedIds;
      }

      return new Set(requestedIds.filter((externalId) => excludedIds.has(externalId)));
    }

    throw new Error(`Falha ao carregar exclusoes de conversas: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.external_id).filter(Boolean));
}

export async function isConversationExcluded(companyId: string, externalId: string) {
  const excludedIds = await getExcludedConversationExternalIds(companyId, [externalId]);
  return excludedIds.has(externalId);
}

export async function createConversationExclusions(
  companyId: string,
  conversations: ExclusionCandidate[]
) {
  const externalIds = conversations
    .map((conversation) => conversation.external_id)
    .filter((externalId): externalId is string => typeof externalId === "string" && externalId.trim().length > 0);

  if (externalIds.length === 0) {
    return 0;
  }

  const supabase = createSupabaseAdminClient();
  const rows = externalIds.map((externalId) => ({
    company_id: companyId,
    external_id: externalId,
  }));

  const { error } = await supabase
    .from("conversation_exclusions")
    .upsert(rows, { onConflict: "company_id,external_id", ignoreDuplicates: false });

  if (error) {
    if (isMissingExclusionsTableError(error)) {
      await saveExcludedConversationExternalIdsToSettings(companyId, externalIds);
      return externalIds.length;
    }

    throw new Error(`Falha ao salvar exclusoes de conversas: ${error.message}`);
  }

  return externalIds.length;
}
