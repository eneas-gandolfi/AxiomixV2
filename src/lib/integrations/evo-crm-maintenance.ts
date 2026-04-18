import type { Json } from "@/database/types/database.types";
import type { EvoCrmConfig } from "@/lib/integrations/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeIntegrationConfig } from "@/lib/integrations/service";

function normalizeEvoBaseUrl(value?: string | null) {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

function normalizeEvoConfig(config: EvoCrmConfig) {
  return {
    baseUrl: normalizeEvoBaseUrl(config.baseUrl),
    apiToken: config.apiToken.trim(),
  };
}

export function hasEvoCrmConfigChanged(currentConfig: Json | null, nextConfig: EvoCrmConfig) {
  try {
    const current = normalizeEvoConfig(decodeIntegrationConfig("evo_crm", currentConfig));
    const next = normalizeEvoConfig(nextConfig);

    return (
      current.baseUrl !== next.baseUrl ||
      current.apiToken !== next.apiToken
    );
  } catch {
    return true;
  }
}

export async function clearEvoCrmCompanyData(companyId: string) {
  const supabase = createSupabaseAdminClient();

  const { error: jobsError } = await supabase
    .from("async_jobs")
    .delete()
    .eq("company_id", companyId)
    .in("job_type", ["evo_crm_sync", "whatsapp_analyze"]);

  if (jobsError) {
    throw new Error(`Falha ao limpar jobs antigos do Evo CRM: ${jobsError.message}`);
  }

  const { error: conversationsError } = await supabase
    .from("conversations")
    .delete()
    .eq("company_id", companyId);

  if (conversationsError) {
    throw new Error(`Falha ao limpar conversas antigas do Evo CRM: ${conversationsError.message}`);
  }
}
